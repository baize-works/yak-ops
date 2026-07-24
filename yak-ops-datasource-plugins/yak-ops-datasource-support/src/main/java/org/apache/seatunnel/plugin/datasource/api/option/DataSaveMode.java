package org.apache.seatunnel.plugin.datasource.api.option;

/**
 * The SaveMode for the Sink connectors that use table or other table structures to organize data
 */
public enum DataSaveMode {

    // Preserve database structure and delete data
    DROP_DATA,

    // Preserve database structure, preserve data
    APPEND_DATA,

    // User defined processing
    CUSTOM_PROCESSING,

    // When there exist data, an error will be reported
    ERROR_WHEN_DATA_EXISTS
}
