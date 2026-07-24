package org.apache.seatunnel.plugin.datasource.api.hocon;

/**
 * JDBC batch HOCON build constants.
 *
 * <p>
 * This class contains Web-side config keys, SeaTunnel official config keys,
 * and placeholder constants used when building JDBC source/sink HOCON.
 * </p>
 */
public final class JdbcBatchConstants {

    private JdbcBatchConstants() {
    }

    // =========================
    // JDBC connection keys
    // =========================

    public static final String URL = "url";
    public static final String USER = "user";
    public static final String USERNAME = "username";
    public static final String PASSWORD = "password";
    public static final String DRIVER = "driver";
    public static final String DATABASE = "database";
    public static final String SCHEMA = "schema";
    public static final String SCHEMA_NAME = "schemaName";

    // =========================
    // SeaTunnel official common keys
    // =========================

    public static final String TABLE = "table";
    public static final String QUERY = "query";
    public static final String TABLE_PATH = "table_path";
    public static final String TABLE_LIST = "table_list";
    public static final String GENERATE_SINK_SQL = "generate_sink_sql";

    // =========================
    // Web compatibility table keys
    // =========================

    public static final String SOURCE_TABLE_LIST = "source_table_list";
    public static final String SINK_TABLE_LIST = "sink_table_list";
    public static final String TARGET_TABLE_NAME = "targetTableName";

    // =========================
    // Single / multi table mode keys
    // =========================

    public static final String MULTI_TABLE = "multiTable";
    public static final String TABLE_PATTERN = "tablePattern";
    public static final String DATABASE_PATTERN = "databasePattern";

    // =========================
    // Workflow node base keys
    // =========================

    public static final String PLUGIN_NAME = "pluginName";
    public static final String CONNECTOR_TYPE = "connectorType";
    public static final String DB_TYPE = "dbType";
    public static final String NODE_TYPE = "nodeType";
    public static final String TITLE = "title";
    public static final String DESCRIPTION = "description";
    public static final String META = "meta";
    public static final String CONFIG = "config";

    // =========================
    // Unified workflow config keys
    // =========================

    public static final String DATA_SOURCE_ID = "dataSourceId";
    public static final String READ_MODE = "readMode";
    public static final String TARGET_MODE = "targetMode";
    public static final String SQL = "sql";


    public static final String AUTO_CREATE_TABLE = "autoCreateTable";
    public static final String PRIMARY_KEY = "primaryKey";
    public static final String WRITE_MODE = "writeMode";
    public static final String BATCH_SIZE = "batchSize";


    public static final String EXTRA_PARAMS = "extraParams";

    // =========================
    // Plugin relation keys
    // =========================

    public static final String PLUGIN_INPUT = "pluginInput";
    public static final String PLUGIN_OUTPUT = "pluginOutput";

    public static final String PLUGIN_INPUT_UNDERSCORE = "plugin_input";
    public static final String PLUGIN_OUTPUT_UNDERSCORE = "plugin_output";

    // =========================
    // SeaTunnel sink option keys
    // =========================

    public static final String DATA_SAVE_MODE = "data_save_mode";
    public static final String SCHEMA_SAVE_MODE = "schema_save_mode";
    public static final String ENABLE_UPSERT = "enable_upsert";
    public static final String PRIMARY_KEYS = "primary_keys";
    public static final String BATCH_SIZE_UNDERSCORE = "batch_size";
    public static final String FIELD_IDE = "field_ide";
    public static final String IS_EXACTLY_ONCE = "is_exactly_once";

    // =========================
    // Web camelCase option keys
    // =========================

    public static final String DATA_SAVE_MODE_CAMEL = "dataSaveMode";
    public static final String SCHEMA_SAVE_MODE_CAMEL = "schemaSaveMode";
    public static final String ENABLE_UPSERT_CAMEL = "enableUpsert";
    public static final String FIELD_IDE_CAMEL = "fieldIde";
    public static final String EXACTLY_ONCE_CAMEL = "exactlyOnce";

    // =========================
    // SeaTunnel source option keys
    // =========================

    public static final String FETCH_SIZE_CAMEL = "fetchSize";
    public static final String FETCH_SIZE_UNDERSCORE = "fetch_size";
    public static final String SPLIT_SIZE_CAMEL = "splitSize";
    public static final String SPLIT_SIZE_DOT = "split.size";

    // =========================
    // Generic params keys
    // =========================

    public static final String PARAMS = "params";
    public static final String KEY = "key";
    public static final String VALUE = "value";

    // =========================
    // Placeholder values
    // =========================

    public static final String DATABASE_NAME_PLACEHOLDER = "${database_name}";
    public static final String SCHEMA_NAME_PLACEHOLDER = "${schema_name}";
    public static final String TABLE_NAME_PLACEHOLDER = "${table_name}";
    public static final String PRIMARY_KEY_PLACEHOLDER = "${primary_key}";

    // =========================
    // Default values
    // =========================

    public static final int DEFAULT_BATCH_SIZE = 1000;

    public static final String WRITE_MODE_APPEND = "append";
    public static final String WRITE_MODE_OVERWRITE = "overwrite";
    public static final String WRITE_MODE_UPSERT = "upsert";

    public static final String DATA_SAVE_MODE_APPEND_DATA = "APPEND_DATA";
    public static final String DATA_SAVE_MODE_DROP_DATA = "DROP_DATA";

    public static final String SCHEMA_SAVE_MODE_CREATE_WHEN_NOT_EXIST = "CREATE_SCHEMA_WHEN_NOT_EXIST";
    public static final String SCHEMA_SAVE_MODE_ERROR_WHEN_NOT_EXIST = "ERROR_WHEN_SCHEMA_NOT_EXIST";
}
