package org.apache.seatunnel.plugin.datasource.mysql.cdc.checker;

import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.cdc.CdcDatasourcePrecheckItem;
import org.apache.seatunnel.plugin.datasource.mysql.cdc.context.MysqlCdcPrecheckContext;
import org.apache.seatunnel.plugin.datasource.mysql.cdc.support.MysqlCdcCheckCodes;
import org.apache.seatunnel.plugin.datasource.mysql.cdc.support.MysqlCdcExpectedValues;
import org.apache.seatunnel.plugin.datasource.mysql.cdc.support.MysqlCdcGrantSupport;
import org.apache.seatunnel.plugin.datasource.mysql.cdc.support.MysqlCdcPrecheckQuerySupport;

import java.sql.Connection;

public class MysqlCdcPrivilegeChecker implements MysqlCdcPrecheckItemChecker {

    @Override
    public String code() {
        return MysqlCdcCheckCodes.PRIVILEGES;
    }

    @Override
    public String name() {
        return "CDC 权限";
    }

    @Override
    public String expectedValue() {
        return MysqlCdcExpectedValues.REQUIRED_PRIVILEGES;
    }

    @Override
    public CdcDatasourcePrecheckItem check(
            MysqlCdcPrecheckContext context,
            Connection connection) {
        String grants = MysqlCdcPrecheckQuerySupport.queryGrants(connection);

        if (StringUtils.isBlank(grants)) {
            return CdcDatasourcePrecheckItem.fail(
                    code(),
                    name(),
                    "未获取到授权信息",
                    expectedValue(),
                    "未获取到当前用户授权信息，请检查 SHOW GRANTS 权限"
            );
        }

        if (MysqlCdcGrantSupport.hasRequiredPrivileges(grants)) {
            return CdcDatasourcePrecheckItem.success(
                    code(),
                    name(),
                    "权限满足",
                    expectedValue(),
                    "当前用户具备 MySQL-CDC 所需权限"
            );
        }

        return CdcDatasourcePrecheckItem.fail(
                code(),
                name(),
                MysqlCdcGrantSupport.simplifyGrants(grants),
                expectedValue(),
                "当前用户可能缺少 CDC 所需权限。建议授权 SELECT、RELOAD、SHOW DATABASES、REPLICATION SLAVE、REPLICATION CLIENT"
        );
    }
}