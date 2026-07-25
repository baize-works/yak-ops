package org.apache.seatunnel.plugin.datasource.oracle.connection;

import org.apache.seatunnel.plugin.datasource.api.constants.DataSourceConstants;
import org.apache.seatunnel.plugin.datasource.api.jdbc.AbstractJdbcConnectionProvider;
import org.apache.seatunnel.plugin.datasource.oracle.param.OracleConnectionParam;

public class OracleConnectionProvider extends AbstractJdbcConnectionProvider<OracleConnectionParam> {

    @Override
    protected String defaultDriverClass() {
        return DataSourceConstants.COM_ORACLE_JDBC_DRIVER;
    }

    @Override
    protected String resolveDriverLocation(OracleConnectionParam t) {
        return defaultBaseUrl() + t.getDriverLocation();
    }
}