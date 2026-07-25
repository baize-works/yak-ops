package org.apache.seatunnel.plugin.datasource.mysql.cdc.context;

import org.apache.seatunnel.plugin.datasource.api.jdbc.DataSourceProcessor;
import org.apache.seatunnel.plugin.datasource.api.jdbc.JdbcConnectionProvider;
import org.apache.seatunnel.plugin.datasource.api.utils.DataSourceUtils;
import io.yak.ops.plugin.spi.datasource.BaseConnectionParam;
import io.yak.ops.plugin.spi.enums.DbType;

public class MysqlCdcPrecheckContextFactory {

    public MysqlCdcPrecheckContext create(String connectionParams) {
        BaseConnectionParam param =
                DataSourceUtils.buildConnectionParams(DbType.MYSQL, connectionParams);

        DataSourceProcessor processor =
                DataSourceUtils.getDatasourceProcessor(DbType.MYSQL);

        JdbcConnectionProvider connectionProvider =
                processor.getConnectionManager();

        return new MysqlCdcPrecheckContext(
                param,
                processor,
                connectionProvider
        );
    }
}
