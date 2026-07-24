package org.apache.seatunnel.plugin.datasource.api.option;

/** Stop mode for the CDC Connectors, see . */
public enum StopMode {
    /** Stop from the latest offset. */
    LATEST,
    /** Stop from user-supplied timestamp. */
    TIMESTAMP,
    /** Stop from user-supplied specific offset. */
    SPECIFIC,
    /** Real-time job don't stop the source. */
    NEVER
}
