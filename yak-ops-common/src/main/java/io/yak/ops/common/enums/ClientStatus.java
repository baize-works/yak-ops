package io.yak.ops.common.enums;


/**
 * Client status enum
 */
public enum ClientStatus {
    CONNECTION_SUCCESS("CONNECTION_SUCCESS"),
    CONNECTION_FAILED("CONNECTION_FAILED"),
    UNKNOWN("UNKNOWN");

    private final String value;

    ClientStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
