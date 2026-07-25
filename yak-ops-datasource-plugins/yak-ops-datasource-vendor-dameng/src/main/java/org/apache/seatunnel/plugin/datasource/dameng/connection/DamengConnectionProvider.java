package org.apache.seatunnel.plugin.datasource.dameng.connection;

import org.apache.seatunnel.plugin.datasource.api.constants.DataSourceConstants;
import org.apache.seatunnel.plugin.datasource.api.jdbc.AbstractJdbcConnectionProvider;
import org.apache.seatunnel.plugin.datasource.dameng.param.DamengConnectionParam;

public class DamengConnectionProvider
        extends AbstractJdbcConnectionProvider<DamengConnectionParam> {

    @Override
    protected String defaultDriverClass() {
        return DataSourceConstants.COM_DAMENG_JDBC_DRIVER;
    }

    @Override
    protected String resolveDriverLocation(DamengConnectionParam t) {
        return defaultBaseUrl() + t.getDriverLocation();
    }
}
