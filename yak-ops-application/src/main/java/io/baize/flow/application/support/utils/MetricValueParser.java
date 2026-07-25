package io.baize.flow.application.support.utils;

public final class MetricValueParser {

    private MetricValueParser() {
    }

    /** Parse value to integer, return 0 if invalid. */
    public static Integer parseInteger(Object value) {
        if (value == null) {
            return 0;
        }
        try {
            return Integer.parseInt(String.valueOf(value).trim());
        } catch (Exception e) {
            return 0;
        }
    }

    /** Parse percent-like value such as "23.5%". */
    public static Double parsePercent(Object value) {
        if (value == null) {
            return null;
        }

        String str = String.valueOf(value).trim();
        if (str.isEmpty()) {
            return null;
        }

        if (str.endsWith("%")) {
            str = str.substring(0, str.length() - 1);
        }

        try {
            return Double.parseDouble(str);
        } catch (Exception e) {
            return null;
        }
    }

    /** Parse value to boolean, return false if invalid. */
    public static Boolean parseBoolean(Object value) {
        if (value == null) {
            return Boolean.FALSE;
        }
        try {
            return Boolean.parseBoolean(String.valueOf(value).trim());
        } catch (Exception e) {
            return Boolean.FALSE;
        }
    }

    /** Parse value to string, return "" if invalid. */
    public static String parseString(Object value) {
        if (value == null) {
            return "";
        }
        try {
            return String.valueOf(value).trim();
        } catch (Exception e) {
            return "";
        }
    }
}
