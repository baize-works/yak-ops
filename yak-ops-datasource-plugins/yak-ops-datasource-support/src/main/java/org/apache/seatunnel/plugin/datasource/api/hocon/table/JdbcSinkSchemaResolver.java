package org.apache.seatunnel.plugin.datasource.api.hocon.table;

import com.typesafe.config.Config;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.jdbc.JdbcConfigReaders;

import static org.apache.seatunnel.plugin.datasource.api.hocon.JdbcBatchConstants.*;

final class JdbcSinkSchemaResolver {

    private JdbcSinkSchemaResolver() {
    }

    static String normalizeSingleTable(Config config, Config conn, String database, String table) {
        String schema = resolvePostgreSqlSchema(config, conn);
        if (StringUtils.isBlank(schema) || StringUtils.isBlank(table)) {
            return table;
        }

        String trimmedTable = table.trim();
        String[] parts = StringUtils.split(trimmedTable, '.');
        if (parts == null || parts.length == 0) {
            return trimmedTable;
        }

        if (parts.length == 1) {
            return schema + "." + trimmedTable;
        }

        String firstPart = parts[0].trim();
        if (StringUtils.equals(firstPart, schema)) {
            return trimmedTable;
        }

        if (StringUtils.isNotBlank(database) && StringUtils.equals(firstPart, database.trim())) {
            if (parts.length == 2) {
                return schema + "." + parts[1].trim();
            }
            if (parts.length == 3) {
                return parts[1].trim() + "." + parts[2].trim();
            }
        }

        return trimmedTable;
    }

    static String defaultMultiTablePattern(Config config, Config conn) {
        String schema = resolvePostgreSqlSchema(config, conn);
        if (StringUtils.isBlank(schema)) {
            return TABLE_NAME_PLACEHOLDER;
        }
        return schema + "." + TABLE_NAME_PLACEHOLDER;
    }

    private static String resolvePostgreSqlSchema(Config config, Config conn) {
        if (!isPostgreSql(config, conn)) {
            return "";
        }

        String schema = firstNonBlank(
                JdbcConfigReaders.getString(config, SCHEMA, ""),
                JdbcConfigReaders.getString(config, SCHEMA_NAME, ""),
                JdbcConfigReaders.getString(conn, SCHEMA, ""),
                JdbcConfigReaders.getString(conn, SCHEMA_NAME, "")
        );
        return StringUtils.trimToEmpty(schema);
    }

    private static boolean isPostgreSql(Config config, Config conn) {
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

    private static boolean containsIgnoreCase(Config config, String path, String searchText) {
        return StringUtils.containsIgnoreCase(JdbcConfigReaders.getString(config, path, ""), searchText);
    }

    private static boolean startsWithIgnoreCase(Config config, String path, String prefix) {
        return StringUtils.startsWithIgnoreCase(JdbcConfigReaders.getString(config, path, ""), prefix);
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (StringUtils.isNotBlank(value)) {
                return value;
            }
        }
        return "";
    }
}
