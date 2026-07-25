package org.apache.seatunnel.plugin.datasource.mysql.cdc.checker;

import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.cdc.CdcDatasourcePrecheckItem;
import org.apache.seatunnel.plugin.datasource.mysql.cdc.context.MysqlCdcPrecheckContext;
import org.apache.seatunnel.plugin.datasource.mysql.cdc.support.MysqlCdcCheckCodes;
import org.apache.seatunnel.plugin.datasource.mysql.cdc.support.MysqlCdcExpectedValues;
import org.apache.seatunnel.plugin.datasource.mysql.cdc.support.MysqlCdcPrecheckQuerySupport;

import java.sql.Connection;

public class MysqlCdcBinlogFormatChecker implements MysqlCdcPrecheckItemChecker {

    @Override
    public String code() {
        return MysqlCdcCheckCodes.BINLOG_FORMAT;
    }

    @Override
    public String name() {
        return "binlog_format";
    }

    @Override
    public String expectedValue() {
        return MysqlCdcExpectedValues.BINLOG_FORMAT_ROW;
    }

    @Override
    public CdcDatasourcePrecheckItem check(
            MysqlCdcPrecheckContext context,
            Connection connection) {
        String value = MysqlCdcPrecheckQuerySupport.queryVariable(connection, "binlog_format");

        if ("ROW".equalsIgnoreCase(value)) {
            return CdcDatasourcePrecheckItem.success(
                    code(),
                    name(),
                    value,
                    expectedValue(),
                    "binlog_format 配置正确"
            );
        }

        return CdcDatasourcePrecheckItem.fail(
                code(),
                name(),
                StringUtils.defaultIfBlank(value, "未获取到"),
                expectedValue(),
                "MySQL-CDC 要求 binlog_format 为 ROW"
        );
    }
}