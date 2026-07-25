package io.baize.flow.infrastructure.alarm.engine;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;

import java.util.HashMap;
import java.util.Map;

/**
 * Converts a stored alarm channel config JSON string into a flat
 * {@code Map<String, String>} suitable for passing to an {@link
 * org.apache.seatunnel.plugin.alarm.api.AlarmChannel}.
 *
 * <p>Scalars (string / number / boolean) become their string form; nested
 * maps and lists are serialised back to JSON strings.  This is the alarm
 * module's equivalent of DolphinScheduler's {@code AlertInfo#alertParams}
 * flattening step.</p>
 *
 * <p>Shared by both {@code AlarmController}
 * (for the channel "test" endpoint) and {@link AlarmRuleEngine} (for actual
 * alarm delivery), eliminating a duplicated implementation.</p>
 */
@Slf4j
public final class AlarmConfigParser {

    private static final TypeReference<Map<String, Object>> CONFIG_TYPE = new TypeReference<>() {
    };

    private AlarmConfigParser() {
    }

    /**
     * Parse a config JSON string into a flat string map.
     *
     * @param objectMapper Jackson instance used for parsing / re-serialising nested values
     * @param configJson    raw JSON string (may be {@code null} or blank)
     * @return a non-null map; empty if the input is blank or unparseable
     */
    public static Map<String, String> parse(ObjectMapper objectMapper, String configJson) {
        if (configJson == null || configJson.trim().isEmpty()) {
            return new HashMap<>();
        }
        try {
            Map<String, Object> raw = objectMapper.readValue(configJson, CONFIG_TYPE);
            Map<String, String> params = new HashMap<>();
            raw.forEach((k, v) -> {
                if (v == null) {
                    return;
                }
                if (v instanceof CharSequence || v instanceof Number || v instanceof Boolean) {
                    params.put(k, v.toString());
                } else {
                    try {
                        params.put(k, objectMapper.writeValueAsString(v));
                    } catch (Exception e) {
                        params.put(k, v.toString());
                    }
                }
            });
            return params;
        } catch (Exception e) {
            log.warn("Failed to parse alarm channel config: {}", configJson, e);
            return new HashMap<>();
        }
    }
}
