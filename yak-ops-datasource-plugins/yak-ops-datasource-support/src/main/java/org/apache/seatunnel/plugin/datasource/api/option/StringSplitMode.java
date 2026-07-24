package org.apache.seatunnel.plugin.datasource.api.option;

public enum StringSplitMode {
    SAMPLE("sample"),

    CHARSET_BASED("charset_based");

    public boolean equals(String mode) {
        return this.mode.equalsIgnoreCase(mode);
    }

    private final String mode;

    StringSplitMode(String mode) {
        this.mode = mode;
    }

    public String getMode() {
        return mode;
    }

    @Override
    public String toString() {
        return mode;
    }
}
