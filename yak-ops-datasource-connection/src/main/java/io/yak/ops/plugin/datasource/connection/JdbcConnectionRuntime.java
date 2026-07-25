package io.yak.ops.plugin.datasource.connection;


import io.yak.ops.plugin.datasource.connection.driver.ClassLoaderStrategy;
import io.yak.ops.plugin.datasource.connection.driver.DefaultDriverProvider;
import io.yak.ops.plugin.datasource.connection.driver.DefaultDriverStorageStrategy;
import io.yak.ops.plugin.datasource.connection.driver.DriverProvider;
import io.yak.ops.plugin.datasource.connection.driver.DriverStorageStrategy;
import io.yak.ops.plugin.datasource.connection.driver.SimpleSharedClassLoaderStrategy;

import java.util.concurrent.atomic.AtomicBoolean;

public final class JdbcConnectionRuntime {

    private static final AtomicBoolean SHUTDOWN =
            new AtomicBoolean(false);

    private static final DefaultConnectionManager CONNECTION_MANAGER =
            createConnectionManager();

    static {
        Runtime.getRuntime().addShutdownHook(
                new Thread(
                        JdbcConnectionRuntime::shutdown,
                        "jdbc-driver-runtime-shutdown"
                )
        );
    }

    private JdbcConnectionRuntime() {
    }

    public static DefaultConnectionManager getConnectionManager() {
        return CONNECTION_MANAGER;
    }

    public static void shutdown() {
        if (SHUTDOWN.compareAndSet(false, true)) {
            CONNECTION_MANAGER.shutdown();
        }
    }

    private static DefaultConnectionManager createConnectionManager() {
        DriverStorageStrategy storageStrategy =
                new DefaultDriverStorageStrategy(
                        DefaultDriverStorageStrategy.Mode.SHARED
                );

        ClassLoader parentClassLoader =
                JdbcConnectionRuntime.class.getClassLoader();

        ClassLoaderStrategy classLoaderStrategy =
                new SimpleSharedClassLoaderStrategy(parentClassLoader);

        DriverProvider driverProvider =
                new DefaultDriverProvider(
                        storageStrategy,
                        classLoaderStrategy
                );

        return new DefaultConnectionManager(driverProvider);
    }
}
