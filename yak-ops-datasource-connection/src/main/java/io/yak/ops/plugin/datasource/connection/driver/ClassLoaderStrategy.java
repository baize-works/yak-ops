package io.yak.ops.plugin.datasource.connection.driver;

import io.yak.ops.plugin.datasource.connection.api.DataSourceId;
import io.yak.ops.plugin.datasource.connection.api.DriverClassPath;
import io.yak.ops.plugin.datasource.connection.api.DriverDescriptor;

import java.io.Closeable;

public interface ClassLoaderStrategy {

    /**
     * 获取一个可用于加载 driver 的 classloader
     * - SHARED: key 通常是 descriptor.fingerprint
     * - ISOLATED: key 通常是 dataSourceId + fingerprint
     */
    ManagedClassLoader getOrCreate(DataSourceId dataSourceId, DriverDescriptor descriptor, DriverClassPath classPath);

    void release(DataSourceId dataSourceId, DriverDescriptor descriptor);

    void shutdown();

    interface ManagedClassLoader extends Closeable {
        ClassLoader classLoader();
        String key();
        @Override void close();
    }
}
