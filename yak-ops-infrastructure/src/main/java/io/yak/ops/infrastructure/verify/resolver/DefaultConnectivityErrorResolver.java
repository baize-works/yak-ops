package io.yak.ops.infrastructure.verify.resolver;

import io.yak.ops.plugin.spi.enums.DbType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class DefaultConnectivityErrorResolver implements ConnectivityErrorResolver {

    @Override
    public String resolve(String logContent, String finalStatus, DbType dbType) {
        if (!StringUtils.hasText(logContent)) {
            return "Job status is " + (finalStatus == null ? "UNKNOWN" : finalStatus);
        }

        String lower = logContent.toLowerCase();

        if (lower.contains("communications link failure")
                || lower.contains("connection refused")
                || lower.contains("connect timed out")
                || lower.contains("unknown host")
                || lower.contains("no route to host")) {
            return "The client cannot reach the datasource host";
        }

        if (lower.contains("access denied")
                || lower.contains("authentication failed")
                || lower.contains("invalid authorization")
                || lower.contains("login failed")
                || lower.contains("ora-01017")
                || lower.contains("password authentication failed")) {
            return "Datasource authentication failed, please check username or password";
        }

        if (lower.contains("driver") && lower.contains("not found")) {
            return "Required database driver is missing on the client";
        }

        if (lower.contains("sqlsyntaxerrorexception")
                || lower.contains("syntax error")
                || lower.contains("bad sql grammar")) {
            return "Test SQL execution failed";
        }

        if (dbType != null && DbType.ORACLE == dbType && lower.contains("ora-")) {
            return "Oracle datasource verification failed, please check network, account or service configuration";
        }

        return "Job status is " + (finalStatus == null ? "UNKNOWN" : finalStatus);
    }
}
