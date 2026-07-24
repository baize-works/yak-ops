package org.apache.seatunnel.plugin.datasource.api.hocon.cdc;

import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.hocon.DataSourceHoconBuilder;
import org.apache.seatunnel.plugin.datasource.api.hocon.HoconBuildContext;
import org.apache.seatunnel.plugin.datasource.api.jdbc.JdbcConfigReaders;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public abstract class AbstractCdcSourceBuilder implements DataSourceHoconBuilder {

    protected static final String HOSTNAME = "hostname";
    protected static final String PORT = "port";
    protected static final String USERNAME = "username";
    protected static final String PASSWORD = "password";
    protected static final String URL = "url";
    protected static final String DEBEZIUM = "debezium";

    protected static final String DATABASE_NAMES = "database-names";
    protected static final String DATABASE_PATTERN = "database-pattern";
    protected static final String TABLE_NAMES = "table-names";
    protected static final String TABLE_PATTERN = "table-pattern";
    protected static final String SERVER_ID = "server-id";
    protected static final String SERVER_TIME_ZONE = "server-time-zone";
    protected static final String STARTUP_MODE = "startup.mode";
    protected static final String STOP_MODE = "stop.mode";
    protected static final String TABLE_NAMES_CONFIG = "table-names-config";

    protected static final String STARTUP_SPECIFIC_OFFSET_FILE = "startup.specific-offset.file";
    protected static final String STARTUP_SPECIFIC_OFFSET_POS = "startup.specific-offset.pos";
    protected static final String STARTUP_TIMESTAMP = "startup.timestamp";

    /**
     * Frontend / node config field.
     */
    protected static final String DATABASE = "database";

    /**
     * Frontend startup fields.
     */
    protected static final String STARTUP_MODE_NODE = "startupMode";
    protected static final String STARTUP_SPECIFIC_OFFSET_FILE_NODE = "startupSpecificOffsetFile";
    protected static final String STARTUP_SPECIFIC_OFFSET_POS_NODE = "startupSpecificOffsetPos";
    protected static final String STARTUP_TIMESTAMP_NODE = "startupTimestamp";

    protected static final String STARTUP_MODE_INITIAL = "initial";
    protected static final String STARTUP_MODE_LATEST = "latest";
    protected static final String STARTUP_MODE_SPECIFIC = "specific";
    protected static final String STARTUP_MODE_TIMESTAMP = "timestamp";

    private final List<CdcTableOptionResolver> tableOptionResolvers = Arrays.asList(
            new MultiTableCdcTableOptionResolver(),
            new SingleTableCdcTableOptionResolver()
    );

    @Override
    public boolean supportsSink() {
        return false;
    }

    @Override
    public Config buildSourceHocon(HoconBuildContext context) {
        Config conn = context.getConnectionConfig();
        Config node = context.getNodeConfig();

        Map<String, Object> map = new HashMap<>(32);

        appendConnectionOptions(conn, node, map);
        appendCaptureOptions(conn, node, map);
        appendStartupOptions(node, map);
        appendPluginRelation(node, map);
        appendExtraParams(node, map);

        return ConfigFactory.parseMap(map);
    }

    @Override
    public Config buildSinkHocon(HoconBuildContext context) {
        throw new UnsupportedOperationException(pluginName() + " does not support sink side");
    }

    protected void appendConnectionOptions(Config conn, Config node, Map<String, Object> map) {
        putIfPresent(conn, URL, map);
        putAliasIfPresent(conn, "user", USERNAME, map);
        putIfPresent(conn, USERNAME, map);
        putIfPresent(conn, PASSWORD, map);
        putIfPresent(conn, HOSTNAME, map);
        putIfPresent(conn, PORT, map);

        // datasource 里面常见字段是 host，这里转成 SeaTunnel CDC 需要的 hostname
        putAliasIfPresent(conn, "host", HOSTNAME, map);
    }

    protected void appendCaptureOptions(Config conn, Config node, Map<String, Object> map) {
        appendDatabaseOptions(conn, node, map);
        appendTableOptions(conn, node, map);

        putIfPresent(node, SERVER_ID, map);
        putIfPresent(node, SERVER_TIME_ZONE, map);

        if (node != null && node.hasPath(TABLE_NAMES_CONFIG)) {
            map.put(TABLE_NAMES_CONFIG, node.getValue(TABLE_NAMES_CONFIG).unwrapped());
        }
    }

    protected void appendDatabaseOptions(Config conn, Config node, Map<String, Object> map) {

        if (node != null && node.hasPath(DATABASE_NAMES)) {
            putListIfPresent(node, DATABASE_NAMES, map);
            return;
        }


        if (node != null && node.hasPath(DATABASE_PATTERN)) {
            putIfPresent(node, DATABASE_PATTERN, map);
            return;
        }


        String database = getString(conn, DATABASE);
        if (StringUtils.isNotBlank(database)) {
            map.put(DATABASE_NAMES, Collections.singletonList(database));
        }
    }

    protected void appendTableOptions(Config conn, Config node, Map<String, Object> map) {
        if (node == null) {
            return;
        }


        if (node.hasPath(TABLE_NAMES)) {
            putListIfPresent(node, TABLE_NAMES, map);
            return;
        }


        if (node.hasPath(TABLE_PATTERN)) {
            putIfPresent(node, TABLE_PATTERN, map);
            return;
        }


        for (CdcTableOptionResolver resolver : tableOptionResolvers) {
            if (resolver.supports(node)) {
                resolver.resolve(conn, node, map);
                return;
            }
        }
    }

    /**
     * 这里重点处理 CDC 启动模式。
     *
     * 前端字段：
     * startupMode
     * startupSpecificOffsetFile
     * startupSpecificOffsetPos
     * startupTimestamp
     *
     * SeaTunnel HOCON 字段：
     * startup.mode
     * startup.specific-offset.file
     * startup.specific-offset.pos
     * startup.timestamp
     */
    protected void appendStartupOptions(Config node, Map<String, Object> map) {
        if (node == null) {
            return;
        }

        String startupMode = resolveStartupMode(node);

        if (StringUtils.isBlank(startupMode)) {
            startupMode = STARTUP_MODE_INITIAL;
        }

        map.put(STARTUP_MODE, startupMode);

        if (STARTUP_MODE_SPECIFIC.equalsIgnoreCase(startupMode)) {
            appendSpecificStartupOptions(node, map);
            return;
        }

        if (STARTUP_MODE_TIMESTAMP.equalsIgnoreCase(startupMode)) {
            appendTimestampStartupOptions(node, map);
        }

        // initial / latest 不需要额外位点参数
    }

    protected String resolveStartupMode(Config node) {
        // 优先尊重 SeaTunnel 原生字段，兼容高级配置
        String rawMode = getString(node, STARTUP_MODE);
        if (StringUtils.isNotBlank(rawMode)) {
            return normalizeStartupMode(rawMode);
        }

        // 兼容前端字段
        rawMode = getString(node, STARTUP_MODE_NODE);
        if (StringUtils.isNotBlank(rawMode)) {
            return normalizeStartupMode(rawMode);
        }

        return STARTUP_MODE_INITIAL;
    }

    protected String normalizeStartupMode(String startupMode) {
        if (StringUtils.isBlank(startupMode)) {
            return STARTUP_MODE_INITIAL;
        }

        String mode = startupMode.trim();

        if (STARTUP_MODE_INITIAL.equalsIgnoreCase(mode)) {
            return STARTUP_MODE_INITIAL;
        }

        if (STARTUP_MODE_LATEST.equalsIgnoreCase(mode)) {
            return STARTUP_MODE_LATEST;
        }

        if (STARTUP_MODE_SPECIFIC.equalsIgnoreCase(mode)) {
            return STARTUP_MODE_SPECIFIC;
        }

        if (STARTUP_MODE_TIMESTAMP.equalsIgnoreCase(mode)) {
            return STARTUP_MODE_TIMESTAMP;
        }

        // 不认识的模式不要直接吞掉，保留用户配置，方便兼容 SeaTunnel 后续新增模式
        return mode;
    }

    protected void appendSpecificStartupOptions(Config node, Map<String, Object> map) {
        Object file = getFirstPresentValue(node, STARTUP_SPECIFIC_OFFSET_FILE, STARTUP_SPECIFIC_OFFSET_FILE_NODE);
        Object pos = getFirstPresentValue(node, STARTUP_SPECIFIC_OFFSET_POS, STARTUP_SPECIFIC_OFFSET_POS_NODE);

        if (isEmptyValue(file)) {
            throw new IllegalArgumentException(
                    "CDC startup mode is specific, but startup specific offset file is empty");
        }

        if (isEmptyValue(pos)) {
            throw new IllegalArgumentException(
                    "CDC startup mode is specific, but startup specific offset position is empty");
        }

        map.put(STARTUP_SPECIFIC_OFFSET_FILE, file);
        map.put(STARTUP_SPECIFIC_OFFSET_POS, pos);
    }

    protected void appendTimestampStartupOptions(Config node, Map<String, Object> map) {
        Object timestamp = getFirstPresentValue(node, STARTUP_TIMESTAMP, STARTUP_TIMESTAMP_NODE);

        if (isEmptyValue(timestamp)) {
            throw new IllegalArgumentException(
                    "CDC startup mode is timestamp, but startup timestamp is empty");
        }

        map.put(STARTUP_TIMESTAMP, timestamp);
    }

    protected void appendPluginRelation(Config node, Map<String, Object> map) {
        putIfPresent(node, "plugin_input", map);
        putIfPresent(node, "plugin_output", map);

        // 兼容前端常见驼峰字段
        putAliasIfPresent(node, "pluginInput", "plugin_input", map);
        putAliasIfPresent(node, "pluginOutput", "plugin_output", map);
    }

    protected void appendExtraParams(Config node, Map<String, Object> map) {
        if (node == null || !node.hasPath("extraParams")) {
            return;
        }

        List<? extends Config> list = node.getConfigList("extraParams");

        for (Config item : list) {
            String key = JdbcConfigReaders.getString(item, "key", "");

            if (StringUtils.isBlank(key)) {
                continue;
            }

            String normalizedKey = key.trim();

            Object value = item.hasPath("value")
                    ? item.getValue("value").unwrapped()
                    : "";

            if (isEmptyValue(value)) {
                continue;
            }

            /*
             * debezium 的类型是 Config，不能作为普通字符串输出。
             *
             * 前端当前传递的是 JSON 字符串：
             * {
             *   "snapshot.locking.mode": "none",
             *   "include.schema.changes": "false"
             * }
             *
             * 这里需要将它解析成 Map，再交给 ConfigFactory.parseMap。
             */
            if (DEBEZIUM.equalsIgnoreCase(normalizedKey)) {
                appendDebeziumOptions(value, map);
                continue;
            }

            map.put(normalizedKey, value);
        }
    }

    protected void appendDebeziumOptions(
            Object value,
            Map<String, Object> map) {

        if (isEmptyValue(value)) {
            return;
        }

        /*
         * 如果前端后续直接传递对象，
         * ConfigValue.unwrapped() 后会得到 Map，可以直接使用。
         */
        if (value instanceof Map) {
            map.put(DEBEZIUM, value);
            return;
        }

        if (!(value instanceof String)) {
            throw new IllegalArgumentException(
                    "CDC debezium parameter must be a JSON object or JSON string"
            );
        }

        String rawValue = ((String) value).trim();

        if (StringUtils.isBlank(rawValue)) {
            return;
        }

        try {
            /*
             * Typesafe Config 同时支持 JSON 和 HOCON。
             *
             * 输入：
             * {
             *   "snapshot.locking.mode": "none",
             *   "include.schema.changes": "false"
             * }
             *
             * 输出为 Map<String, Object>，而不再是普通 String。
             */
            Config debeziumConfig = ConfigFactory.parseString(rawValue);

            Map<String, Object> debeziumOptions =
                    debeziumConfig.root().unwrapped();

            if (debeziumOptions.isEmpty()) {
                return;
            }

            map.put(DEBEZIUM, debeziumOptions);
        } catch (RuntimeException e) {
            throw new IllegalArgumentException(
                    "Invalid debezium config, expected a JSON object, actual value: "
                            + rawValue,
                    e
            );
        }
    }

    protected Object getFirstPresentValue(Config config, String primaryKey, String fallbackKey) {
        if (config == null) {
            return null;
        }

        if (config.hasPath(primaryKey)) {
            Object value = config.getValue(primaryKey).unwrapped();
            if (!isEmptyValue(value)) {
                return value;
            }
        }

        if (config.hasPath(fallbackKey)) {
            Object value = config.getValue(fallbackKey).unwrapped();
            if (!isEmptyValue(value)) {
                return value;
            }
        }

        return null;
    }

    protected void putIfPresent(Config config, String key, Map<String, Object> map) {
        if (config == null || !config.hasPath(key)) {
            return;
        }

        Object value = config.getValue(key).unwrapped();
        if (isEmptyValue(value)) {
            return;
        }

        map.put(key, value);
    }

    protected void putAliasIfPresent(
            Config config,
            String sourceKey,
            String targetKey,
            Map<String, Object> map) {
        if (config == null || !config.hasPath(sourceKey)) {
            return;
        }

        Object value = config.getValue(sourceKey).unwrapped();
        if (isEmptyValue(value)) {
            return;
        }

        map.put(targetKey, value);
    }

    protected void putListIfPresent(Config config, String key, Map<String, Object> map) {
        if (config == null || !config.hasPath(key)) {
            return;
        }

        Object value = config.getValue(key).unwrapped();
        if (isEmptyValue(value)) {
            return;
        }

        map.put(key, value);
    }

    protected String getString(Config config, String key) {
        if (config == null || !config.hasPath(key)) {
            return null;
        }

        String value = config.getString(key);
        return StringUtils.isBlank(value) ? null : value.trim();
    }

    protected boolean isEmptyValue(Object value) {
        if (value == null) {
            return true;
        }

        if (value instanceof String) {
            return StringUtils.isBlank((String) value);
        }

        if (value instanceof List) {
            return ((List<?>) value).isEmpty();
        }

        return false;
    }
}