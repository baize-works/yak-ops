package org.apache.seatunnel.plugin.datasource.mysql.connection;

import org.apache.seatunnel.plugin.datasource.api.constants.DataSourceConstants;
import org.apache.seatunnel.plugin.datasource.api.jdbc.AbstractJdbcConnectionProvider;
import org.apache.seatunnel.plugin.datasource.mysql.param.MySQLConnectionParam;

public class MySQLConnectionProvider
        extends AbstractJdbcConnectionProvider<MySQLConnectionParam> {

    @Override
    protected String defaultDriverClass() {
        return DataSourceConstants.COM_MYSQL_CJ_JDBC_DRIVER;
    }

    @Override
    protected String resolveDriverLocation(MySQLConnectionParam t) {
        return defaultBaseUrl() + t.getDriverLocation();
    }
}