package io.yak.ops.infrastructure.client;

import org.apache.commons.lang3.StringUtils;

public class SeaTunnelClientUrlUtils {

    private SeaTunnelClientUrlUtils() {
    }

    public static String buildBaseUrl(String protocol, String host, Object port) {
        String normalizedProtocol = normalizeProtocol(protocol);

        if (StringUtils.isBlank(host)) {
            return null;
        }

        String normalizedHost = host.trim();

        if (normalizedHost.startsWith("http://") || normalizedHost.startsWith("https://")) {
            return removeEndSlash(normalizedHost);
        }

        if (port == null || StringUtils.isBlank(String.valueOf(port))) {
            return normalizedProtocol + "://" + normalizedHost;
        }

        return normalizedProtocol + "://" + normalizedHost + ":" + String.valueOf(port).trim();
    }

    public static String normalizeProtocol(String protocol) {
        if (StringUtils.equalsIgnoreCase(protocol, "https")) {
            return "https";
        }
        return "http";
    }

    public static String removeEndSlash(String value) {
        if (value == null) {
            return null;
        }

        String result = value.trim();

        while (result.endsWith("/")) {
            result = result.substring(0, result.length() - 1);
        }

        return result;
    }
}
