package io.baize.flow.plugin.datasource.connection.driver;

import io.baize.flow.plugin.datasource.connection.api.DataSourceId;
import io.baize.flow.plugin.datasource.connection.api.DriverClassPath;
import io.baize.flow.plugin.datasource.connection.api.DriverDescriptor;

import java.sql.Driver;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

public class DefaultDriverProvider implements DriverProvider {

    private final DriverStorageStrategy storageStrategy;
    private final ClassLoaderStrategy classLoaderStrategy;

    private final ConcurrentMap<String, DriverHandle> cache =
            new ConcurrentHashMap<>();

    public DefaultDriverProvider(
            DriverStorageStrategy storageStrategy,
            ClassLoaderStrategy classLoaderStrategy) {
        this.storageStrategy = storageStrategy;
        this.classLoaderStrategy = classLoaderStrategy;
    }

    @Override
    public DriverHandle getOrCreate(
            DataSourceId dataSourceId,
            DriverDescriptor descriptor) {

        String key = buildKey(dataSourceId, descriptor);

        return cache.computeIfAbsent(
                key,
                ignored -> createDriver(dataSourceId, descriptor)
        );
    }

    private DriverHandle createDriver(
            DataSourceId dataSourceId,
            DriverDescriptor descriptor) {

        DriverClassPath classPath =
                storageStrategy.prepare(dataSourceId, descriptor);

        ClassLoaderStrategy.ManagedClassLoader managedClassLoader = null;

        try {
            managedClassLoader =
                    classLoaderStrategy.getOrCreate(
                            dataSourceId,
                            descriptor,
                            classPath
                    );

            Class<?> driverClass =
                    managedClassLoader
                            .classLoader()
                            .loadClass(descriptor.getDriverClass());

            Object driverInstance =
                    driverClass
                            .getDeclaredConstructor()
                            .newInstance();

            if (!(driverInstance instanceof Driver)) {
                throw new IllegalStateException(
                        descriptor.getDriverClass()
                                + " does not implement java.sql.Driver"
                );
            }

            return new DriverHandle(
                    (Driver) driverInstance,
                    managedClassLoader
            );
        } catch (Throwable e) {
            if (managedClassLoader != null) {
                classLoaderStrategy.release(
                        dataSourceId,
                        descriptor
                );
            }

            storageStrategy.release(
                    dataSourceId,
                    descriptor
            );

            throw new IllegalStateException(
                    "Load JDBC driver failed: "
                            + descriptor.getDriverClass(),
                    e
            );
        }
    }

    @Override
    public void release(
            DataSourceId dataSourceId,
            DriverDescriptor descriptor) {

        String key = buildKey(dataSourceId, descriptor);

        DriverHandle removed = cache.remove(key);

        // 已经释放过则不重复操作
        if (removed == null) {
            return;
        }

        classLoaderStrategy.release(
                dataSourceId,
                descriptor
        );

        storageStrategy.release(
                dataSourceId,
                descriptor
        );
    }

    @Override
    public void shutdown() {
        cache.clear();
        classLoaderStrategy.shutdown();
        storageStrategy.shutdown();
    }

    private String buildKey(
            DataSourceId dataSourceId,
            DriverDescriptor descriptor) {

        return dataSourceId.value()
                + "::"
                + descriptor.getFingerprint()
                + "::"
                + descriptor.getDriverClass();
    }
}
