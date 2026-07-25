package io.yak.ops.plugin.datasource.connection.driver;


import io.yak.ops.plugin.datasource.connection.api.DataSourceId;
import io.yak.ops.plugin.datasource.connection.api.DriverClassPath;
import io.yak.ops.plugin.datasource.connection.api.DriverDescriptor;

import java.io.Serializable;

public interface DriverStorageStrategy extends Serializable {



    DriverClassPath prepare(DataSourceId dataSourceId, DriverDescriptor descriptor);


    void release(DataSourceId dataSourceId, DriverDescriptor descriptor);

    void shutdown();
}
