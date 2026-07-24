package org.apache.seatunnel.plugin.datasource.mysql.cdc;

import com.google.auto.service.AutoService;
import org.apache.seatunnel.plugin.datasource.api.cdc.CdcDatasourcePrecheckProvider;
import org.apache.seatunnel.plugin.datasource.api.cdc.CdcDatasourcePrecheckResult;
import org.apache.seatunnel.plugin.datasource.mysql.cdc.MysqlCdcPrecheckService;
import io.baize.flow.plugin.spi.enums.DbType;

@AutoService(CdcDatasourcePrecheckProvider.class)
public class MySQLCDCPrecheckProvider implements CdcDatasourcePrecheckProvider {

    private final MysqlCdcPrecheckService precheckService =
            new MysqlCdcPrecheckService();

    @Override
    public DbType dbType() {
        return DbType.MYSQL;
    }

    @Override
    public String pluginName() {
        return "MYSQL-CDC";
    }

    @Override
    public CdcDatasourcePrecheckResult check(String connectionParams) {
        return precheckService.check(connectionParams);
    }
}