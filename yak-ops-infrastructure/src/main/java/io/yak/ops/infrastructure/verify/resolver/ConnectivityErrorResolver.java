package io.yak.ops.infrastructure.verify.resolver;

import io.yak.ops.plugin.spi.enums.DbType;

/**
 * Resolve user-friendly connectivity error messages from verification results.
 */
public interface ConnectivityErrorResolver {

    /**
     * Resolve the final error message based on logs, status, and datasource type.
     */
    String resolve(String logContent, String finalStatus, DbType dbType);
}
