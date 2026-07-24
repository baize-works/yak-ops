package org.apache.seatunnel.plugin.datasource.api.cdc;

import io.baize.flow.plugin.spi.enums.DbType;


public interface CdcDatasourcePrecheckProvider {

    DbType dbType();

    String pluginName();

    CdcDatasourcePrecheckResult check(String connectionParams);

    default boolean supports(DbType dbType, String pluginName) {
        return dbType() == dbType
                && pluginName() != null
                && pluginName().equalsIgnoreCase(pluginName);
    }
}
