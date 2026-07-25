package org.apache.seatunnel.plugin.datasource.mysql.cdc.support;

import org.apache.commons.lang3.StringUtils;

import java.util.Locale;

public final class MysqlCdcGrantSupport {

    private MysqlCdcGrantSupport() {
    }

    public static boolean hasRequiredPrivileges(String grants) {
        if (StringUtils.isBlank(grants)) {
            return false;
        }

        String normalized = grants.toUpperCase(Locale.ROOT);

        if (normalized.contains("ALL PRIVILEGES")) {
            return true;
        }

        boolean hasSelect = normalized.contains("SELECT");
        boolean hasReload = normalized.contains("RELOAD");
        boolean hasShowDatabases = normalized.contains("SHOW DATABASES");

        boolean hasReplicationSlave =
                normalized.contains("REPLICATION SLAVE")
                        || normalized.contains("REPLICATION REPLICA");

        boolean hasReplicationClient =
                normalized.contains("REPLICATION CLIENT");

        return hasSelect
                && hasReload
                && hasShowDatabases
                && hasReplicationSlave
                && hasReplicationClient;
    }

    public static String simplifyGrants(String grants) {
        if (StringUtils.isBlank(grants)) {
            return "未获取到";
        }

        String normalized = grants.replace('\n', ' ').trim();

        if (normalized.length() <= 300) {
            return normalized;
        }

        return normalized.substring(0, 300) + "...";
    }
}