package org.apache.seatunnel.plugin.datasource.api.hocon.cdc;

import com.typesafe.config.Config;
import org.apache.commons.lang3.StringUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

public class MultiTableCdcTableOptionResolver implements CdcTableOptionResolver {

    private static final String DATABASE = "database";
    private static final String TABLE_NAMES = "table-names";
    private static final String TABLE_PATTERN = "table-pattern";

    /**
     * Frontend / node config field.
     */
    private static final String MULTI_TABLE = "multiTable";
    private static final String MATCH_MODE = "matchMode";

    /**
     * Frontend match mode.
     */
    private static final String MATCH_MODE_CUSTOM = "1";
    private static final String MATCH_MODE_REGEX = "2";
    private static final String MATCH_MODE_EXACT = "3";
    private static final String MATCH_MODE_WHOLE_DATABASE = "4";

    /**
     * Frontend table fields.
     */
    private static final String SOURCE_TABLE = "sourceTable";
    private static final String TABLE_KEYWORD = "tableKeyword";
    private static final String SOURCE_TABLE_LIST = "source_table_list";
    private static final String TABLE_LIST = "table_list";
    private static final String TABLE_NAMES_NODE = "tableNames";

    @Override
    public boolean supports(Config node) {
        if (node == null) {
            return false;
        }

        String matchMode = getString(node, MATCH_MODE);
        if (isRegexMode(matchMode)
                || isExactMode(matchMode)
                || isWholeDatabaseMode(matchMode)) {
            return true;
        }

        if (isMultiTable(node)) {
            return true;
        }

        return !getStringList(node, SOURCE_TABLE_LIST).isEmpty()
                || !getStringList(node, TABLE_LIST).isEmpty()
                || !getStringList(node, TABLE_NAMES_NODE).isEmpty()
                || StringUtils.isNotBlank(getString(node, SOURCE_TABLE));
    }

    @Override
    public void resolve(Config conn, Config node, Map<String, Object> map) {
        String database = getString(conn, DATABASE);
        String matchMode = getString(node, MATCH_MODE);

        if (isWholeDatabaseMode(matchMode)) {
            map.put(TABLE_PATTERN, buildWholeDatabasePattern(database));
            return;
        }

        if (isRegexMode(matchMode)) {
            String tablePattern = resolveTablePattern(node);
            if (StringUtils.isBlank(tablePattern)) {
                throw new IllegalArgumentException(
                        "CDC regex match mode requires table pattern");
            }

            map.put(TABLE_PATTERN, buildFullTablePattern(database, tablePattern));
            return;
        }

        List<String> tables = resolveTables(node);
        List<String> fullTableNames = buildFullTableNames(database, tables);

        if (!fullTableNames.isEmpty()) {
            map.put(TABLE_NAMES, fullTableNames);
        }
    }

    private boolean isRegexMode(String matchMode) {
        return MATCH_MODE_REGEX.equals(matchMode);
    }

    private boolean isExactMode(String matchMode) {
        return MATCH_MODE_EXACT.equals(matchMode);
    }

    private boolean isWholeDatabaseMode(String matchMode) {
        return MATCH_MODE_WHOLE_DATABASE.equals(matchMode);
    }

    private boolean isMultiTable(Config node) {
        if (node == null || !node.hasPath(MULTI_TABLE)) {
            return false;
        }

        try {
            return node.getBoolean(MULTI_TABLE);
        } catch (Exception ignored) {
            String value = getString(node, MULTI_TABLE);
            return "true".equalsIgnoreCase(value);
        }
    }

    private String resolveTablePattern(Config node) {
        String pattern = getString(node, SOURCE_TABLE);
        if (StringUtils.isNotBlank(pattern)) {
            return pattern;
        }

        pattern = getString(node, TABLE_KEYWORD);
        if (StringUtils.isNotBlank(pattern)) {
            return pattern;
        }

        return getString(node, TABLE_PATTERN);
    }

    private List<String> resolveTables(Config node) {
        List<String> tables = getStringList(node, SOURCE_TABLE_LIST);
        if (!tables.isEmpty()) {
            return tables;
        }

        tables = getStringList(node, TABLE_LIST);
        if (!tables.isEmpty()) {
            return tables;
        }

        tables = getStringList(node, TABLE_NAMES_NODE);
        if (!tables.isEmpty()) {
            return tables;
        }

        String sourceTable = getString(node, SOURCE_TABLE);
        if (StringUtils.isNotBlank(sourceTable)) {
            return splitByComma(sourceTable);
        }

        return Collections.emptyList();
    }

    private List<String> buildFullTableNames(String database, List<String> tables) {
        List<String> result = new ArrayList<>();

        if (tables == null || tables.isEmpty()) {
            return result;
        }

        for (String table : tables) {
            if (StringUtils.isBlank(table)) {
                continue;
            }

            result.add(buildFullTableName(database, table));
        }

        return result;
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

    private String buildWholeDatabasePattern(String database) {
        if (StringUtils.isBlank(database)) {
            return ".*";
        }

        return database.trim() + "\\..*";
    }

    private String buildFullTablePattern(String database, String tablePattern) {
        String normalizedPattern = normalizeRegexPattern(tablePattern);

        if (StringUtils.isBlank(database)) {
            return normalizedPattern;
        }

        String trimmedDatabase = database.trim();

        if (normalizedPattern.startsWith(trimmedDatabase + "\\.")
                || normalizedPattern.startsWith(trimmedDatabase + ".")) {
            return normalizedPattern;
        }

        return trimmedDatabase + "\\." + normalizedPattern;
    }

    private String normalizeRegexPattern(String pattern) {
        if (StringUtils.isBlank(pattern)) {
            return null;
        }

        List<String> parts = splitByComma(pattern);
        if (parts.isEmpty()) {
            return null;
        }

        if (parts.size() == 1) {
            return parts.get(0);
        }

        return "(" + String.join("|", parts) + ")";
    }

    private List<String> splitByComma(String value) {
        if (StringUtils.isBlank(value)) {
            return Collections.emptyList();
        }

        String[] array = value.split(",");
        List<String> result = new ArrayList<>();

        for (String item : array) {
            if (StringUtils.isBlank(item)) {
                continue;
            }

            result.add(item.trim());
        }

        return result;
    }

    private List<String> getStringList(Config config, String key) {
        if (config == null || !config.hasPath(key)) {
            return Collections.emptyList();
        }

        Object value = config.getValue(key).unwrapped();
        if (!(value instanceof List)) {
            return Collections.emptyList();
        }

        List<?> rawList = (List<?>) value;
        List<String> result = new ArrayList<>();

        for (Object item : rawList) {
            if (item == null) {
                continue;
            }

            String text = String.valueOf(item).trim();
            if (StringUtils.isNotBlank(text)) {
                result.add(text);
            }
        }

        return result;
    }

    private String getString(Config config, String key) {
        if (config == null || !config.hasPath(key)) {
            return null;
        }

        Object value = config.getValue(key).unwrapped();
        if (value == null) {
            return null;
        }

        String text = String.valueOf(value);
        return StringUtils.isBlank(text) ? null : text.trim();
    }
}