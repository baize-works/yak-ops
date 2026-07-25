package io.yak.ops.common.config;

public enum SeaTunnelAPIErrorCode implements SeaTunnelErrorCode {
    CONFIG_VALIDATION_FAILED("API-01", "Configuration item validate failed"),
    OPTION_VALIDATION_FAILED("API-02", "Option item validate failed"),
    CATALOG_INITIALIZE_FAILED("API-03", "Catalog initialize failed"),
    DATABASE_NOT_EXISTED("API-04", "Database not existed"),
    TABLE_NOT_EXISTED("API-05", "Table not existed"),
    FACTORY_INITIALIZE_FAILED("API-06", "Factory initialize failed"),
    DATABASE_ALREADY_EXISTED("API-07", "Database already existed"),
    TABLE_ALREADY_EXISTED("API-08", "Table already existed"),
    HANDLE_SAVE_MODE_FAILED("API-09", "Handle save mode failed"),
    SOURCE_ALREADY_HAS_DATA("API-10", "The target data source already has data"),
    SINK_TABLE_NOT_EXIST("API-11", "The sink table not exist"),
    LIST_DATABASES_FAILED("API-12", "List databases failed"),
    LIST_TABLES_FAILED("API-13", "List tables failed"),
    GET_PRIMARY_KEY_FAILED("API-14", "Get primary key failed");

    private final String code;
    private final String description;

    SeaTunnelAPIErrorCode(String code, String description) {
        this.code = code;
        this.description = description;
    }

    @Override
    public String getCode() {
        return code;
    }

    @Override
    public String getDescription() {
        return description;
    }
}
