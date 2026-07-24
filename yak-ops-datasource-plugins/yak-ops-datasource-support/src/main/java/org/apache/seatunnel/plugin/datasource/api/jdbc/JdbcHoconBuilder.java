package org.apache.seatunnel.plugin.datasource.api.jdbc;

import com.typesafe.config.Config;

/**
 * Builder that converts connection parameters and user config into
 * Seatunnel HOCON configuration for JDBC source/sink plugins.
 */
public interface JdbcHoconBuilder {

    /**
     * Build HOCON config for JDBC source (read) side.
     *
     * @param connectionParam JSON string of connection details
     * @param config          existing user configuration to merge
     * @return complete Typesafe Config for source plugin
     */
    Config buildSourceHocon(String connectionParam, Config config);

    /**
     * Build HOCON config for JDBC sink (write) side.
     *
     * @param connectionParam JSON string of connection details
     * @param config          existing user configuration to merge
     * @return complete Typesafe Config for sink plugin
     */
    Config buildSinkHocon(String connectionParam, Config config);
}