package io.yak.ops.engine.legacy;

import io.yak.ops.engine.api.EngineClientAuthentication;
import io.yak.ops.engine.api.EngineClientPort;
import io.yak.ops.engine.legacy.internal.vendor.exception.SeaTunnelClientException;
import io.yak.ops.engine.legacy.internal.vendor.rest.SeaTunnelClientResolver;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Map;

@SuppressWarnings({"unchecked", "rawtypes"})
@Service("legacyEngineRestClient")
public class LegacyRestClient implements EngineClientPort {
    private static final String REST_ROOT = "/hazelcast/rest";
    private final RestTemplate restTemplate;
    private final SeaTunnelClientResolver resolver;


    public LegacyRestClient(
            @Qualifier("legacyEngineRestTemplate")
                    RestTemplate restTemplate,
            SeaTunnelClientResolver resolver) {

        this.restTemplate = restTemplate;
        this.resolver = resolver;
    }

    public Map overview(Long clientId, Map<String, String> tags) {
        return get(clientId, "/maps/overview", tags, Map.class);
    }

    public Map overview(String baseUrl, Map<String, String> tags) {
        return get(baseUrl, null, tags, null, "/maps/overview", Map.class);
    }

    public Map overview(
            String baseUrl,
            String contextPath,
            Map<String, String> tags,
            EngineClientAuthentication auth) {
        return get(baseUrl, contextPath, tags, auth, "/maps/overview", Map.class);
    }

    public List systemMonitoringInformation(
            String baseUrl,
            String contextPath,
            LegacyClientAuthentication auth) {
        return get(baseUrl, contextPath, java.util.Collections.emptyMap(), auth, "/maps/system-monitoring-information", List.class);
    }

    public List runningJobs(Long clientId) {
        return get(clientId, "/maps/running-jobs", java.util.Collections.emptyMap(), List.class);
    }

    public Map jobInfo(Long clientId, String jobId) {
        return get(clientId, "/maps/job-info/" + jobId, java.util.Collections.emptyMap(), Map.class);
    }

    public List finishedJobs(Long clientId, String state) {
        return get(clientId, "/maps/finished-jobs", state == null ? java.util.Collections.emptyMap() : java.util.Collections.singletonMap("state", state), List.class);
    }

    public List systemMonitoringInformation(Long clientId) {
        return get(clientId, "/maps/system-monitoring-information", java.util.Collections.emptyMap(), List.class);
    }

    public String logs(
            Long clientId,
            String jobIdOrNull,
            String formatOrNull) {
        return get(clientId, "/logs", query("jobId", jobIdOrNull, "format", formatOrNull), String.class);
    }

    public String jobLogs(
            Long clientId,
            String engineJobId,
            String formatOrNull) {
        return get(clientId, "/job-logs/" + engineJobId, query("format", formatOrNull), String.class);
    }

    public String nodeLogs(Long clientId) {
        return get(clientId, "/node-logs", java.util.Collections.emptyMap(), String.class);
    }

    public String metrics(Long clientId, boolean openMetrics) {
        return get(clientId, "/metrics", java.util.Collections.singletonMap("openMetrics", Boolean.toString(openMetrics)), String.class);
    }

    public Map submitJobText(
            Long clientId,
            String configText,
            String format,
            String jobId,
            String jobName,
            Boolean isStartWithSavePoint) {
        return post(clientId, "/job/submit", configText, MediaType.TEXT_PLAIN, query("format", format, "jobId", jobId, "jobName", jobName, "isStartWithSavePoint", isStartWithSavePoint), Map.class);
    }

    public Map submitJobJson(
            Long clientId,
            Object configJsonObject,
            String jobId,
            String jobName,
            Boolean isStartWithSavePoint) {
        return post(clientId, "/job/submit", configJsonObject, MediaType.APPLICATION_JSON, query("jobId", jobId, "jobName", jobName, "isStartWithSavePoint", isStartWithSavePoint), Map.class);
    }

    public Map submitJobUpload(
            Long clientId,
            byte[] fileBytes,
            String filename) {
        return submitJobUpload(clientId, fileBytes, filename, null, null, null);
    }

    public Map submitJobUpload(
            Long clientId,
            byte[] fileBytes,
            String filename,
            String jobId,
            String jobName,
            Boolean isStartWithSavePoint) {
        MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
        form.add("file", new org.springframework.core.io.ByteArrayResource(fileBytes) {
            @Override
            public String getFilename() {
                return filename;
            }
        });
        return post(clientId, "/job/upload", form, MediaType.MULTIPART_FORM_DATA, query("jobId", jobId, "jobName", jobName, "isStartWithSavePoint", isStartWithSavePoint), Map.class);
    }

    public List submitJobsBatch(
            Long clientId,
            List jobConfigs) {
        return post(clientId, "/job/submit-batch", jobConfigs, MediaType.APPLICATION_JSON, java.util.Collections.emptyMap(), List.class);
    }

    public Map stopJob(
            Long clientId,
            String jobId,
            boolean isStopWithSavePoint) {
        return post(clientId, "/job/stop/" + jobId, null, MediaType.APPLICATION_JSON, java.util.Collections.singletonMap("isStopWithSavePoint", Boolean.toString(isStopWithSavePoint)), Map.class);
    }

    public Map checkpointOverview(
            Long clientId,
            Long jobId) {
        return get(clientId, "/maps/checkpoint-overview/" + jobId, java.util.Collections.emptyMap(), Map.class);
    }

    public List checkpointHistory(
            Long clientId,
            Long jobId,
            Long pipelineId,
            Integer limit,
            String status) {
        return get(clientId, "/maps/checkpoint-history/" + jobId + "/" + pipelineId, query("limit", limit, "status", status), List.class);
    }

    public List stopJobsBatch(
            Long clientId,
            List<Map<String, Object>> items) {
        return post(clientId, "/job/stop-batch", items, MediaType.APPLICATION_JSON, java.util.Collections.emptyMap(), List.class);
    }

    private <T> T get(Long clientId, String path, Map<String, String> query, Class<T> type) {
        return get(resolver.resolveBaseApiUrl(clientId), resolver.resolveContextPath(clientId), query, resolver.resolveAuth(clientId), path, type);
    }

    private <T> T get(String baseUrl, String contextPath, Map<String, String> query, EngineClientAuthentication auth, String path, Class<T> type) {
        return exchange(baseUrl, contextPath, path, HttpMethod.GET, null, null, query, auth, type);
    }

    private <T> T post(Long clientId, String path, Object body, MediaType contentType, Map<String, String> query, Class<T> type) {
        return exchange(resolver.resolveBaseApiUrl(clientId), resolver.resolveContextPath(clientId), path, HttpMethod.POST, body, contentType, query, resolver.resolveAuth(clientId), type);
    }

    private <T> T exchange(String baseUrl, String contextPath, String path, HttpMethod method, Object body, MediaType contentType, Map<String, String> query, EngineClientAuthentication auth, Class<T> type) {
        HttpHeaders headers = new HttpHeaders();
        if (contentType != null) headers.setContentType(contentType);
        if (auth != null && Boolean.TRUE.equals(auth.getAuthEnabled()))
            headers.setBasicAuth(auth.getUsername(), auth.getPassword());
        String root = trim(baseUrl) + normalize(contextPath) + REST_ROOT + path;
        UriComponentsBuilder uri = UriComponentsBuilder.fromHttpUrl(root);
        query.forEach((key, value) -> {
            if (value != null) uri.queryParam(key, value);
        });
        try {
            return restTemplate.exchange(uri.toUriString(), method, new HttpEntity<>(body, headers), type).getBody();
        } catch (RestClientResponseException e) {
            throw new SeaTunnelClientException("SeaTunnel returned HTTP " + e.getRawStatusCode(), e.getRawStatusCode(), e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            throw new SeaTunnelClientException("SeaTunnel request failed", 0, null, e);
        }
    }

    private static String trim(String value) {
        if (value == null || value.trim().isEmpty())
            throw new IllegalArgumentException("SeaTunnel base URL must not be blank");
        return value.replaceAll("/+$", "");
    }

    private static String normalize(String value) {
        return value == null || value.trim().isEmpty() ? "" : "/" + value.replaceAll("^/+|/+$", "");
    }

    private static Map<String, String> query(Object... values) {
        java.util.LinkedHashMap<String, String> result = new java.util.LinkedHashMap<>();
        for (int i = 0; i < values.length; i += 2)
            if (values[i + 1] != null) result.put((String) values[i], String.valueOf(values[i + 1]));
        return result;
    }
}
