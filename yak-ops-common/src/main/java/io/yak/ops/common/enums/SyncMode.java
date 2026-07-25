package io.yak.ops.common.enums;


import java.util.Arrays;

public enum SyncMode {

    TABLE_LIST("1"),
    TABLE_PATTERN("2"),
    FULL_DATABASE("4");

    private final String code;

    SyncMode(String code) {
        this.code = code;
    }

    public static SyncMode of(String code) {
        return Arrays.stream(values())
                .filter(e -> e.code.equals(code))
                .findFirst()
                .orElseThrow(() ->
                        new IllegalArgumentException("Unsupported sync mode: " + code));
    }
}

