package org.apache.seatunnel.plugin.datasource.api.jdbc;

import io.baize.flow.plugin.spi.datasource.BaseConnectionParam;

/**
 * Converter for JDBC connection parameters.
 */
public interface JdbcParamConverter {

    /**
     * Create connection parameters from JSON string.
     *
     * @param connectionJson JSON string containing connection details
     * @return parsed connection parameters
     */
    BaseConnectionParam createConnectionParams(String connectionJson);

    /**
     * check datasource param is valid.
     * @throws IllegalArgumentException if invalid
     */
    void checkDatasourceParam(BaseConnectionParam baseConnectionParam);
}
