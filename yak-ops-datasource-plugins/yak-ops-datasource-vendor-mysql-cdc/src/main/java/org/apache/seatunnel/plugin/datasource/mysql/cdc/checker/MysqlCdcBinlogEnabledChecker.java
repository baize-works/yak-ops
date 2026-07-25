package org.apache.seatunnel.plugin.datasource.mysql.cdc.checker;

import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.cdc.CdcDatasourcePrecheckItem;
import org.apache.seatunnel.plugin.datasource.mysql.cdc.context.MysqlCdcPrecheckContext;
import org.apache.seatunnel.plugin.datasource.mysql.cdc.support.MysqlCdcCheckCodes;
import org.apache.seatunnel.plugin.datasource.mysql.cdc.support.MysqlCdcExpectedValues;
import org.apache.seatunnel.plugin.datasource.mysql.cdc.support.MysqlCdcPrecheckQuerySupport;

import java.sql.Connection;

public class MysqlCdcBinlogEnabledChecker implements MysqlCdcPrecheckItemChecker {

    @Override
    public String code() {
        return MysqlCdcCheckCodes.BINLOG_ENABLED;
    }

    @Override
    public String name() {
        return "binlog 开启状态";
    }

    @Override
    public String expectedValue() {
        return MysqlCdcExpectedValues.LOG_BIN_ON;
    }

    @Override
    public CdcDatasourcePrecheckItem check(
            MysqlCdcPrecheckContext context,
            Connection connection) {
        String value = MysqlCdcPrecheckQuerySupport.queryVariable(connection, "log_bin");

        if ("ON".equalsIgnoreCase(value) || "1".equals(value)) {
            return CdcDatasourcePrecheckItem.success(
                    code(),
                    name(),
                    value,
                    expectedValue(),
                    "MySQL 已开启 binlog"
            );
        }

        return CdcDatasourcePrecheckItem.fail(
                code(),
                name(),
                StringUtils.defaultIfBlank(value, "未获取到"),
                expectedValue(),
                "MySQL 未开启 binlog，CDC 无法捕获增量变更"
        );
    }
}