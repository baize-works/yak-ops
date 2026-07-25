package org.apache.seatunnel.plugin.datasource.pgsql.connection;

import org.apache.seatunnel.plugin.datasource.api.constants.DataSourceConstants;
import org.apache.seatunnel.plugin.datasource.api.jdbc.AbstractJdbcConnectionProvider;
import org.apache.seatunnel.plugin.datasource.pgsql.param.PgSQLConnectionParam;

public class PgSQLConnectionProvider
        extends AbstractJdbcConnectionProvider<PgSQLConnectionParam> {

    @Override
    protected String defaultDriverClass() {
        return DataSourceConstants.ORG_POSTGRESQL_DRIVER;
    }

    @Override
    protected String resolveDriverLocation(PgSQLConnectionParam t) {
        return defaultBaseUrl() + t.getDriverLocation();
    }
}