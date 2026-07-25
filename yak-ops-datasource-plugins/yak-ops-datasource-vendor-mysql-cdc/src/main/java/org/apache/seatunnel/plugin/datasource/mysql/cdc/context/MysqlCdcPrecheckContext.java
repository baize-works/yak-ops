package org.apache.seatunnel.plugin.datasource.mysql.cdc.context;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.apache.seatunnel.plugin.datasource.api.jdbc.DataSourceProcessor;
import org.apache.seatunnel.plugin.datasource.api.jdbc.JdbcConnectionProvider;
import io.baize.flow.plugin.spi.datasource.BaseConnectionParam;

import java.sql.Connection;

@Data
@AllArgsConstructor
public class MysqlCdcPrecheckContext {

    private BaseConnectionParam connectionParam;

    private DataSourceProcessor processor;

    private JdbcConnectionProvider connectionProvider;

    public Connection openConnection() {
        return connectionProvider.getConnection(connectionParam);
    }
}
