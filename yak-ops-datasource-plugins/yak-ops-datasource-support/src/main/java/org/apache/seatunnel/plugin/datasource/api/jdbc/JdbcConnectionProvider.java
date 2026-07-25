package org.apache.seatunnel.plugin.datasource.api.jdbc;

import io.baize.flow.plugin.spi.datasource.ConnectionParam;

import java.sql.Connection;

/**
 * JDBC connection provider interface.
 */
public interface JdbcConnectionProvider {

    /**
     * Get a database connection based on the given parameters.
     *
     * @param param connection parameters
     * @return active JDBC connection
     */
    Connection getConnection(ConnectionParam param);


    /**
     * Check if the data source is reachable.
     *
     * @param connectionParam connection parameters
     * @return true if connectivity test passes
     */
    boolean checkDataSourceConnectivity(ConnectionParam connectionParam);
}
