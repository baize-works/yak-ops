package org.apache.seatunnel.plugin.datasource.mysql.cdc.checker;

import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.cdc.CdcDatasourcePrecheckItem;
import org.apache.seatunnel.plugin.datasource.mysql.cdc.context.MysqlCdcPrecheckContext;
import org.apache.seatunnel.plugin.datasource.mysql.cdc.support.MysqlCdcCheckCodes;
import org.apache.seatunnel.plugin.datasource.mysql.cdc.support.MysqlCdcExpectedValues;
import org.apache.seatunnel.plugin.datasource.mysql.cdc.support.MysqlCdcPrecheckQuerySupport;

import java.sql.Connection;

public class MysqlCdcBinlogRowImageChecker implements MysqlCdcPrecheckItemChecker {

    @Override
    public String code() {
        return MysqlCdcCheckCodes.BINLOG_ROW_IMAGE;
    }

    @Override
    public String name() {
        return "binlog_row_image";
    }

    @Override
    public String expectedValue() {
        return MysqlCdcExpectedValues.BINLOG_ROW_IMAGE_FULL;
    }

    @Override
    public CdcDatasourcePrecheckItem check(
            MysqlCdcPrecheckContext context,
            Connection connection) {
        String value = MysqlCdcPrecheckQuerySupport.queryVariable(connection, "binlog_row_image");

        if ("FULL".equalsIgnoreCase(value)) {
            return CdcDatasourcePrecheckItem.success(
                    code(),
                    name(),
                    value,
                    expectedValue(),
                    "binlog_row_image 配置正确"
            );
        }

        return CdcDatasourcePrecheckItem.fail(
                code(),
                name(),
                StringUtils.defaultIfBlank(value, "未获取到"),
                expectedValue(),
                "建议设置 binlog_row_image=FULL，避免 UPDATE/DELETE 变更信息不完整"
        );
    }
}