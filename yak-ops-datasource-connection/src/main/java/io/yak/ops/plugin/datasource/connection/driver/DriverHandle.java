package io.yak.ops.plugin.datasource.connection.driver;


import java.io.Closeable;
import java.sql.Driver;

public final class DriverHandle implements Closeable {
    private final Driver driver;
    private final ClassLoaderStrategy.ManagedClassLoader managedClassLoader;

    public DriverHandle(Driver driver, ClassLoaderStrategy.ManagedClassLoader managedClassLoader) {
        this.driver = driver;
        this.managedClassLoader = managedClassLoader;
    }

    public Driver driver() { return driver; }

    @Override
    public void close() {
    }
}
