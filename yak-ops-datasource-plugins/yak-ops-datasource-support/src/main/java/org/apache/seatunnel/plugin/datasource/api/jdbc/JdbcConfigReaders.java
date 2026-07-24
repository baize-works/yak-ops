package org.apache.seatunnel.plugin.datasource.api.jdbc;

import com.typesafe.config.Config;
import com.typesafe.config.ConfigValue;
import org.apache.commons.lang3.StringUtils;

import java.util.List;
import java.util.Map;

import static org.apache.seatunnel.plugin.datasource.api.hocon.JdbcBatchConstants.*;

public final class JdbcConfigReaders {

    private JdbcConfigReaders() {
    }

    public static boolean hasText(Config config, String path) {
        if (config == null || !config.hasPath(path) || config.getValue(path) == null) {
            return false;
        }
        Object value = config.getValue(path).unwrapped();
        return value != null && StringUtils.isNotBlank(String.valueOf(value));
    }

    public static String getStringRequired(Config config, String path) {
        if (config == null || !config.hasPath(path)) {
            throw new IllegalArgumentException("Missing required configuration: " + path);
        }
        Object value = config.getValue(path).unwrapped();
        if (value == null) {
            throw new IllegalArgumentException("Configuration value is null: " + path);
        }
        String result = String.valueOf(value).trim();
        if (result.isEmpty()) {
            throw new IllegalArgumentException("Configuration value is blank: " + path);
        }
        return result;
    }

    public static String getString(Config config, String path, String defaultValue) {
        if (config == null || !config.hasPath(path) || config.getValue(path) == null) {
            return defaultValue;
        }
        Object value = config.getValue(path).unwrapped();
        return value == null ? defaultValue : String.valueOf(value).trim();
    }

    public static Integer getInteger(Config config, String path, Integer defaultValue) {
        if (config == null || !config.hasPath(path) || config.getValue(path) == null) {
            return defaultValue;
        }

        Object value = config.getValue(path).unwrapped();
        if (value == null) {
            return defaultValue;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }

        String str = String.valueOf(value).trim();
        if (StringUtils.isBlank(str)) {
            return defaultValue;
        }

        try {
            return Integer.parseInt(str);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid integer configuration: " + path + "=" + str, e);
        }
    }

    public static Long getLong(Config config, String path, Long defaultValue) {
        if (config == null || !config.hasPath(path) || config.getValue(path) == null) {
            return defaultValue;
        }

        Object value = config.getValue(path).unwrapped();
        if (value == null) {
            return defaultValue;
        }
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }

        String str = String.valueOf(value).trim();
        if (StringUtils.isBlank(str)) {
            return defaultValue;
        }

        try {
            return Long.parseLong(str);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid long configuration: " + path + "=" + str, e);
        }
    }

    public static Boolean getBoolean(Config config, String path, Boolean defaultValue) {
        if (config == null || !config.hasPath(path) || config.getValue(path) == null) {
            return defaultValue;
        }

        Object value = config.getValue(path).unwrapped();
        if (value == null) {
            return defaultValue;
        }
        if (value instanceof Boolean) {
            return (Boolean) value;
        }

        String str = String.valueOf(value).trim();
        if (StringUtils.isBlank(str)) {
            return defaultValue;
        }
        if ("true".equalsIgnoreCase(str)) {
            return true;
        }
        if ("false".equalsIgnoreCase(str)) {
            return false;
        }

        throw new IllegalArgumentException("Invalid boolean configuration: " + path + "=" + str);
    }

    public static void appendConfigObject(Config config, String path, Map<String, Object> map) {
        if (config == null || !config.hasPath(path)) {
            return;
        }
        Config subConfig = config.getConfig(path);
        for (Map.Entry<String, ConfigValue> entry : subConfig.entrySet()) {
            map.put(entry.getKey(), entry.getValue().unwrapped());
        }
    }

    public static void parseParamsArray(Config config, Map<String, Object> map) {
        if (config == null || !config.hasPath(PARAMS)) {
            return;
        }

        List<? extends Config> list = config.getConfigList(PARAMS);
        for (Config item : list) {
            String key = getString(item, KEY, "");
            if (StringUtils.isBlank(key)) {
                continue;
            }
            Object value = item.hasPath(VALUE) ? item.getValue(VALUE).unwrapped() : "";
            map.put(key.trim(), value);
        }
    }
}
