package org.apache.seatunnel.plugin.datasource.api.hocon.table;

import com.typesafe.config.Config;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.jdbc.JdbcConfigReaders;
import org.apache.seatunnel.plugin.datasource.api.jdbc.TablePath;

import java.util.ArrayList;
import java.util.List;

import static org.apache.seatunnel.plugin.datasource.api.hocon.JdbcBatchConstants.*;


public class JdbcTableNameResolver {

    public List<String> resolveSourceTableNames(Config config) {
        List<String> tables = resolveTableNameList(config, SOURCE_TABLE_LIST);
        if (CollectionUtils.isNotEmpty(tables)) {
            return tables;
        }

        tables = resolveTableNameList(config, TABLE_LIST);
        if (CollectionUtils.isNotEmpty(tables)) {
            return tables;
        }

        String tablePath = JdbcConfigReaders.getString(config, TABLE_PATH, "");
        if (StringUtils.isNotBlank(tablePath)) {
            tables.add(tablePath.trim());
            return tables;
        }

        String table = JdbcConfigReaders.getString(config, TABLE, "");
        if (StringUtils.isNotBlank(table)) {
            tables.add(table.trim());
        }

        return tables;
    }

    public List<String> resolveSinkTableNames(Config config) {
        List<String> tables = resolveTableNameList(config, SINK_TABLE_LIST);
        if (CollectionUtils.isNotEmpty(tables)) {
            return tables;
        }

        String table = JdbcConfigReaders.getString(config, TABLE, "");
        if (StringUtils.isNotBlank(table)) {
            tables.add(table.trim());
        }

        String targetTableName = JdbcConfigReaders.getString(config, TARGET_TABLE_NAME, "");
        if (StringUtils.isNotBlank(targetTableName) && !tables.contains(targetTableName.trim())) {
            tables.add(targetTableName.trim());
        }

        return tables;
    }

    public JdbcTableMode resolveTableMode(Config config, List<String> tables) {
        if (config != null && JdbcConfigReaders.getBoolean(config, MULTI_TABLE, false)) {
            return JdbcTableMode.MULTI;
        }

        if (CollectionUtils.isNotEmpty(tables) && tables.size() > 1) {
            return JdbcTableMode.MULTI;
        }

        return JdbcTableMode.SINGLE;
    }

    public String resolveSingleSourceTablePath(
            Config config,
            String database,
            String schema,
            List<String> sourceTables) {

        String tablePath = JdbcConfigReaders.getString(config, TABLE_PATH, "");
        if (StringUtils.isNotBlank(tablePath)) {
            return tablePath.trim();
        }

        String table = JdbcConfigReaders.getString(config, TABLE, "");
        if (StringUtils.isBlank(table)) {
            table = firstTable(sourceTables);
        }

        if (StringUtils.isBlank(table)) {
            return "";
        }

        if (isFullTablePath(table)) {
            return table.trim();
        }

        return buildTablePath(database, schema, table);
    }

    public String resolveDatabase(Config config, Config conn) {
        String database = firstNonBlank(
                JdbcConfigReaders.getString(config, DATABASE, ""),
                JdbcConfigReaders.getString(conn, DATABASE, ""));
        if (StringUtils.isNotBlank(database)) {
            return database;
        }

        if (isPostgreSql(config, conn)) {
            return extractPostgreSqlDatabaseFromUrl(
                    firstNonBlank(
                            JdbcConfigReaders.getString(config, URL, ""),
                            JdbcConfigReaders.getString(conn, URL, "")));
        }

        return "";
    }

    public String resolveSchema(Config config, Config conn) {
        return firstNonBlank(
                JdbcConfigReaders.getString(config, SCHEMA, ""),
                JdbcConfigReaders.getString(config, SCHEMA_NAME, ""),
                JdbcConfigReaders.getString(conn, SCHEMA, ""),
                JdbcConfigReaders.getString(conn, SCHEMA_NAME, ""));
    }

    public String normalizeSourceTablePath(
            Config config,
            Config conn,
            String database,
            String schema,
            String table) {
        if (StringUtils.isBlank(table)) {
            return "";
        }

        String trimmed = table.trim();
        if (isPostgreSql(config, conn)) {
            return normalizePostgreSqlSourceTablePath(database, schema, trimmed);
        }

        if (isOracle(config, conn)) {
            return normalizeOracleSourceTablePath(schema, trimmed);
        }

        if (isFullTablePath(trimmed)) {
            return trimmed;
        }

        return buildTablePath(database, schema, trimmed);
    }

    public String buildTablePath(String database, String schema, String table) {
        if (StringUtils.isBlank(table)) {
            return "";
        }

        if (StringUtils.isNotBlank(database) && StringUtils.isNotBlank(schema)) {
            return database.trim() + "." + schema.trim() + "." + table.trim();
        }

        if (StringUtils.isNotBlank(database)) {
            return database.trim() + "." + table.trim();
        }

        if (StringUtils.isNotBlank(schema)) {
            return schema.trim() + "." + table.trim();
        }

        return table.trim();
    }

    private String normalizeOracleSourceTablePath(String schema, String table) {
        if (StringUtils.isBlank(table)) {
            return "";
        }

        String trimmed = table.trim();
        if (isFullTablePath(trimmed)) {
            return trimmed;
        }

        if (StringUtils.isNotBlank(schema)) {
            return schema.trim() + "." + trimmed;
        }

        return trimmed;
    }

    private String normalizePostgreSqlSourceTablePath(String database, String schema, String table) {
        String[] parts = StringUtils.split(table, '.');
        if (parts == null || parts.length == 0) {
            return "";
        }

        if (parts.length >= 3) {
            return table;
        }

        if (parts.length == 2) {
            if (StringUtils.isBlank(database)) {
                return table;
            }

            String firstPart = parts[0].trim();
            String tableName = parts[1].trim();
            if (StringUtils.equals(firstPart, database.trim()) && StringUtils.isNotBlank(schema)) {
                return TablePath.of(database.trim(), schema.trim(), tableName).getFullName();
            }

            return TablePath.of(database.trim(), firstPart, tableName).getFullName();
        }

        String finalSchema = StringUtils.isNotBlank(schema) ? schema.trim() : "public";
        return TablePath.of(
                normalizeBlank(database),
                finalSchema,
                parts[0].trim()).getFullName();
    }

    public boolean isFullTablePath(String table) {
        return StringUtils.isNotBlank(table) && table.contains(".");
    }

    public String firstTable(List<String> tables) {
        if (CollectionUtils.isEmpty(tables)) {
            return "";
        }

        for (String table : tables) {
            if (StringUtils.isNotBlank(table)) {
                return table.trim();
            }
        }

        return "";
    }

    private boolean isPostgreSql(Config config, Config conn) {
        return containsIgnoreCase(config, PLUGIN_NAME, "postgres")
                || containsIgnoreCase(conn, PLUGIN_NAME, "postgres")
                || containsIgnoreCase(config, PLUGIN_NAME, "kingbase")
                || containsIgnoreCase(conn, PLUGIN_NAME, "kingbase")
                || containsIgnoreCase(config, PLUGIN_NAME, "dameng")
                || containsIgnoreCase(conn, PLUGIN_NAME, "dameng")
                || containsIgnoreCase(config, DB_TYPE, "postgre")
                || containsIgnoreCase(conn, DB_TYPE, "postgre")
                || containsIgnoreCase(config, DB_TYPE, "kingbase")
                || containsIgnoreCase(conn, DB_TYPE, "kingbase")
                || containsIgnoreCase(config, DB_TYPE, "dameng")
                || containsIgnoreCase(conn, DB_TYPE, "dameng")
                || containsIgnoreCase(config, DRIVER, "postgresql")
                || containsIgnoreCase(conn, DRIVER, "postgresql")
                || containsIgnoreCase(config, DRIVER, "kingbase")
                || containsIgnoreCase(conn, DRIVER, "kingbase")
                || containsIgnoreCase(config, DRIVER, "dm.jdbc")
                || containsIgnoreCase(conn, DRIVER, "dm.jdbc")
                || startsWithIgnoreCase(config, URL, "jdbc:postgresql:")
                || startsWithIgnoreCase(conn, URL, "jdbc:postgresql:")
                || startsWithIgnoreCase(config, URL, "jdbc:kingbase8:")
                || startsWithIgnoreCase(conn, URL, "jdbc:kingbase8:")
                || startsWithIgnoreCase(config, URL, "jdbc:dm:")
                || startsWithIgnoreCase(conn, URL, "jdbc:dm:");
    }

    private boolean isOracle(Config config, Config conn) {
        return containsIgnoreCase(config, PLUGIN_NAME, "oracle")
                || containsIgnoreCase(conn, PLUGIN_NAME, "oracle")
                || containsIgnoreCase(config, DB_TYPE, "oracle")
                || containsIgnoreCase(conn, DB_TYPE, "oracle")
                || containsIgnoreCase(config, DRIVER, "oracle")
                || containsIgnoreCase(conn, DRIVER, "oracle")
                || startsWithIgnoreCase(config, URL, "jdbc:oracle:")
                || startsWithIgnoreCase(conn, URL, "jdbc:oracle:");
    }

    private boolean containsIgnoreCase(Config config, String path, String searchText) {
        return StringUtils.containsIgnoreCase(JdbcConfigReaders.getString(config, path, ""), searchText);
    }

    private boolean startsWithIgnoreCase(Config config, String path, String prefix) {
        return StringUtils.startsWithIgnoreCase(JdbcConfigReaders.getString(config, path, ""), prefix);
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (StringUtils.isNotBlank(value)) {
                return value.trim();
            }
        }
        return "";
    }

    private String extractPostgreSqlDatabaseFromUrl(String url) {
        if (StringUtils.isBlank(url)) {
            return "";
        }

        int pathStart = url.indexOf('/', "jdbc:postgresql://".length());
        if (pathStart < 0 || pathStart + 1 >= url.length()) {
            return "";
        }

        int queryStart = url.indexOf('?', pathStart);
        int end = queryStart >= 0 ? queryStart : url.length();
        String database = url.substring(pathStart + 1, end);
        return StringUtils.trimToEmpty(database);
    }

    private String normalizeBlank(String value) {
        return StringUtils.isBlank(value) ? null : value.trim();
    }

    private List<String> resolveTableNameList(Config config, String path) {
        List<String> result = new ArrayList<>();
        if (config == null || !config.hasPath(path)) {
            return result;
        }

        try {
            List<? extends Config> objectList = config.getConfigList(path);
            for (Config item : objectList) {
                String tablePath = JdbcConfigReaders.getString(item, TABLE_PATH, "");
                if (StringUtils.isNotBlank(tablePath)) {
                    addDistinct(result, tablePath);
                    continue;
                }

                String table = JdbcConfigReaders.getString(item, TABLE, "");
                if (StringUtils.isNotBlank(table)) {
                    addDistinct(result, table);
                }
            }

            if (CollectionUtils.isNotEmpty(result)) {
                return result;
            }
        } catch (Exception ignored) {
            // Maybe it is List<String>, continue below.
        }

        try {
            List<String> values = config.getStringList(path);
            for (String value : values) {
                addDistinct(result, value);
            }
        } catch (Exception ignored) {
            return result;
        }

        return result;
    }

    private void addDistinct(List<String> target, String value) {
        if (StringUtils.isBlank(value)) {
            return;
        }

        String cleaned = value.trim();
        if (!target.contains(cleaned)) {
            target.add(cleaned);
        }
    }
}
