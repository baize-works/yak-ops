package org.apache.seatunnel.plugin.datasource.api.option;

/** Startup modes for the CDC Connectors, see . */
public enum StartupMode {
    /** Startup from the earliest offset possible. */
    EARLIEST,
    /** Startup from the latest offset. */
    LATEST,
    /** Synchronize historical data at startup, and then synchronize incremental data. */
    INITIAL,
    /** Start from user-supplied timestamp. */
    TIMESTAMP,
    /** Startup from user-supplied specific offsets. */
    SPECIFIC
}
