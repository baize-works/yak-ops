package org.apache.seatunnel.plugin.datasource.mysql.cdc.checker;

import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.cdc.CdcDatasourcePrecheckItem;
import org.apache.seatunnel.plugin.datasource.mysql.cdc.context.MysqlCdcPrecheckContext;
import org.apache.seatunnel.plugin.datasource.mysql.cdc.support.MysqlCdcCheckCodes;
import org.apache.seatunnel.plugin.datasource.mysql.cdc.support.MysqlCdcExpectedValues;
import org.apache.seatunnel.plugin.datasource.mysql.cdc.support.MysqlCdcPrecheckQuerySupport;

import java.sql.Connection;

public class MysqlCdcServerIdChecker implements MysqlCdcPrecheckItemChecker {

    @Override
    public String code() {
        return MysqlCdcCheckCodes.SERVER_ID;
    }

    @Override
    public String name() {
        return "server_id";
    }

    @Override
    public String expectedValue() {
        return MysqlCdcExpectedValues.SERVER_ID_POSITIVE;
    }

    @Override
    public CdcDatasourcePrecheckItem check(
            MysqlCdcPrecheckContext context,
            Connection connection) {
        String value = MysqlCdcPrecheckQuerySupport.queryVariable(connection, "server_id");

        if (StringUtils.isBlank(value)) {
            return CdcDatasourcePrecheckItem.fail(
                    code(),
                    name(),
                    "未获取到",
                    expectedValue(),
                    "未获取到 server_id"
            );
        }

        try {
            long serverId = Long.parseLong(value);
            if (serverId > 0) {
                return CdcDatasourcePrecheckItem.success(
                        code(),
                        name(),
                        value,
                        expectedValue(),
                        "server_id 配置正确"
                );
            }
        } catch (NumberFormatException ignored) {
            // add failed result below
        }

        return CdcDatasourcePrecheckItem.fail(
                code(),
                name(),
                value,
                expectedValue(),
                "MySQL-CDC 要求 server_id 大于 0"
        );
    }
}