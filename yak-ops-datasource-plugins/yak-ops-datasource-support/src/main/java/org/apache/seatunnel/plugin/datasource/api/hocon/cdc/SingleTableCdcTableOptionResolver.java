package org.apache.seatunnel.plugin.datasource.api.hocon.cdc;

import com.typesafe.config.Config;
import org.apache.commons.lang3.StringUtils;

import java.util.Collections;
import java.util.Map;

public class SingleTableCdcTableOptionResolver implements CdcTableOptionResolver {

    private static final String DATABASE = "database";
    private static final String TABLE_NAMES = "table-names";

    /**
     * Frontend / node config field.
     */
    private static final String TABLE = "table";
    private static final String TABLE_PATH = "table_path";

    @Override
    public boolean supports(Config node) {
        if (node == null) {
            return false;
        }

        return StringUtils.isNotBlank(resolveTable(node));
    }

    @Override
    public void resolve(Config conn, Config node, Map<String, Object> map) {
        String database = getString(conn, DATABASE);
        String table = resolveTable(node);

        if (StringUtils.isBlank(table)) {
            return;
        }

        map.put(TABLE_NAMES, Collections.singletonList(buildFullTableName(database, table)));
    }

    private String resolveTable(Config node) {
        String table = getString(node, TABLE);
        if (StringUtils.isNotBlank(table)) {
            return table;
        }

        table = getString(node, TABLE_PATH);
        if (StringUtils.isNotBlank(table)) {
            return table;
        }

        return null;
    }

    private String buildFullTableName(String database, String table) {
        String trimmedTable = table.trim();

        if (trimmedTable.contains(".")) {
            return trimmedTable;
        }

        if (StringUtils.isBlank(database)) {
            return trimmedTable;
        }

        return database.trim() + "." + trimmedTable;
    }

    private String getString(Config config, String key) {
        if (config == null || !config.hasPath(key)) {
            return null;
        }

        String value = config.getString(key);
        return StringUtils.isBlank(value) ? null : value.trim();
    }
}