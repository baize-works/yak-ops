package org.apache.seatunnel.plugin.datasource.mysql.cdc.checker;

import org.apache.seatunnel.plugin.datasource.api.cdc.CdcDatasourcePrecheckItem;
import org.apache.seatunnel.plugin.datasource.mysql.cdc.context.MysqlCdcPrecheckContext;

import java.sql.Connection;

public interface MysqlCdcPrecheckItemChecker {

    String code();

    String name();

    String expectedValue();

    CdcDatasourcePrecheckItem check(
            MysqlCdcPrecheckContext context,
            Connection connection
    ) throws Exception;
}