package io.yak.ops.plugin.datasource.connection.driver;

import io.yak.ops.plugin.datasource.connection.api.DataSourceId;
import io.yak.ops.plugin.datasource.connection.api.DriverDescriptor;

public interface DriverProvider {
    DriverHandle getOrCreate(DataSourceId dataSourceId, DriverDescriptor descriptor);

    void release(DataSourceId dataSourceId, DriverDescriptor descriptor);

    void shutdown();
}
