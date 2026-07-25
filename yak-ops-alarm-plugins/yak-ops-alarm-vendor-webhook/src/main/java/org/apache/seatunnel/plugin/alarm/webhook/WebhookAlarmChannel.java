package org.apache.seatunnel.plugin.alarm.webhook;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.apache.seatunnel.plugin.alarm.api.AlarmChannel;
import org.apache.seatunnel.plugin.alarm.api.AlarmData;
import org.apache.seatunnel.plugin.alarm.api.AlarmInfo;
import org.apache.seatunnel.plugin.alarm.api.AlarmResult;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Map;

/**
 * Webhook alarm channel worker: delivers an alarm as a JSON POST to a
 * configurable HTTP endpoint.
 */
@Slf4j
public class WebhookAlarmChannel implements AlarmChannel {

    public static final String CHANNEL_TYPE = WebhookAlarmChannelFactory.WEBHOOK;

    private static final int DEFAULT_TIMEOUT_MS = 10_000;

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };

    @Override
    public AlarmResult process(AlarmInfo info) {
        Map<String, String> params = info == null ? null : info.getAlarmParams();
        if (params == null) {
            return AlarmResult.fail("alarm params is empty");
        }
        String url = params.get("url");
        if (url == null || url.isBlank()) {
            return AlarmResult.fail("webhook url is not configured");
        }

        String method = params.getOrDefault("method", "POST");
        int timeoutMs = parseIntOrDefault(params.get("timeoutMs"), DEFAULT_TIMEOUT_MS);
        Map<String, Object> headers = parseHeaders(params.get("headers"));
        String bodyTemplate = params.get("bodyTemplate");
        String body = (bodyTemplate != null && !bodyTemplate.isBlank())
                ? renderTemplate(bodyTemplate, info.getAlarmData())
                : buildBody(info.getAlarmData());

        HttpURLConnection conn = null;
        try {
            conn = (HttpURLConnection) URI.create(url).toURL().openConnection();
            final HttpURLConnection connection = conn;
            conn.setRequestMethod(method);
            conn.setConnectTimeout(timeoutMs);
            conn.setReadTimeout(timeoutMs);
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
            conn.setRequestProperty("Accept", "application/json");
            headers.forEach((k, v) -> {
                if (k != null && v != null) {
                    connection.setRequestProperty(k, v.toString());
                }
            });

            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.getBytes(StandardCharsets.UTF_8));
            }

            int code = conn.getResponseCode();
            String responseBody = readResponseBody(conn);
            if (code >= 200 && code < 300) {
                // DingTalk / Feishu etc. return 200 but embed error in JSON body
                String errMsg = extractErrorMessage(responseBody);
                if (errMsg != null) {
                    return AlarmResult.fail("webhook error: " + errMsg + " | response: " + responseBody);
                }
                return AlarmResult.success("status " + code + " | response: " + responseBody);
            }
            return AlarmResult.fail("webhook responded with status " + code + " | response: " + responseBody);
        } catch (IOException e) {
            log.warn("Webhook alarm delivery failed, url={}", url, e);
            return AlarmResult.fail(e.getMessage());
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    private String buildBody(AlarmData data) {
        if (data == null) {
            return "{}";
        }
        return WebhookJsonBuilder.object()
                .add("title", data.getTitle())
                .add("content", data.getContent())
                .add("log", data.getLog())
                .add("severity", data.getSeverity() == null ? null : data.getSeverity().name())
                .build();
    }

    /**
     * Render a body template by replacing {@code ${title}}, {@code ${content}},
     * {@code ${severity}}, {@code ${log}} placeholders with actual alarm data values.
     */
    private String renderTemplate(String template, AlarmData data) {
        if (data == null) {
            return template;
        }
        String result = template;
        result = result.replace("${title}", safe(data.getTitle()));
        result = result.replace("${content}", safe(data.getContent()));
        result = result.replace("${severity}", data.getSeverity() == null ? "" : data.getSeverity().name());
        result = result.replace("${log}", safe(data.getLog()));
        return result;
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private String readResponseBody(HttpURLConnection conn) {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            return sb.toString();
        } catch (IOException e) {
            // If error stream exists, try reading it
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(conn.getErrorStream(), StandardCharsets.UTF_8))) {
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
                return sb.toString();
            } catch (IOException ex) {
                return "";
            }
        }
    }

    /**
     * Extract error message from common webhook response formats (DingTalk, Feishu, etc.)
     */
    private String extractErrorMessage(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            return null;
        }
        try {
            Map<String, Object> map = OBJECT_MAPPER.readValue(responseBody, MAP_TYPE);
            // DingTalk: errcode, errmsg
            // Feishu: code, msg
            Object errCode = map.get("errcode");
            if (errCode != null) {
                int code = errCode instanceof Number ? ((Number) errCode).intValue() : Integer.parseInt(errCode.toString());
                if (code != 0) {
                    Object msg = map.get("errmsg");
                    return msg != null ? msg.toString() : "errcode=" + code;
                }
            }
            Object feishuCode = map.get("code");
            if (feishuCode != null) {
                int code = feishuCode instanceof Number ? ((Number) feishuCode).intValue() : Integer.parseInt(feishuCode.toString());
                if (code != 0) {
                    Object msg = map.get("msg");
                    return msg != null ? msg.toString() : "code=" + code;
                }
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    private Map<String, Object> parseHeaders(String headersJson) {
        if (headersJson == null || headersJson.isBlank()) {
            return Collections.emptyMap();
        }
        try {
            return OBJECT_MAPPER.readValue(headersJson, MAP_TYPE);
        } catch (Exception e) {
            log.warn("Failed to parse webhook headers, ignoring: {}", headersJson, e);
            return Collections.emptyMap();
        }
    }

    private int parseIntOrDefault(String value, int fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            return fallback;
        }
    }
}
