package io.yak.ops.common.utils;


public final class Strings {
    private Strings() {
    }

    public static boolean isNullOrEmpty(String string) {
        return string == null || string.isEmpty();
    }

}
