package io.yak.ops.plugin.datasource.connection;

import io.yak.ops.plugin.datasource.connection.api.ConnectionManager;
import io.yak.ops.plugin.datasource.connection.api.DataSourceConfig;
import io.yak.ops.plugin.datasource.connection.api.DataSourceId;
import io.yak.ops.plugin.datasource.connection.api.DriverDescriptor;
import io.yak.ops.plugin.datasource.connection.driver.DriverHandle;
import io.yak.ops.plugin.datasource.connection.driver.DriverProvider;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Properties;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

public class DefaultConnectionManager implements ConnectionManager {

    private static final String SQL_STATE_CODE = "08001";

    private final DriverProvider driverProvider;

    private final ConcurrentMap<String, DriverDescriptor> activeDrivers =
            new ConcurrentHashMap<>();

    public DefaultConnectionManager(DriverProvider driverProvider) {
        this.driverProvider = driverProvider;
    }

    @Override
    public Connection getConnection(
            DataSourceConfig config) throws SQLException {

        validateConfig(config);

        DataSourceId dataSourceId = config.getDataSourceId();
        DriverDescriptor currentDescriptor = config.getDriver();

        DriverHandle handle =
                driverProvider.getOrCreate(
                        dataSourceId,
                        currentDescriptor
                );

        Properties properties = config.toJdbcProperties();

        try {
            Connection connection =
                    handle.driver().connect(
                            config.getUrl(),
                            properties
                    );

            if (connection == null) {
                throw new SQLException(
                        "No suitable driver found for URL: "
                                + config.getUrl(),
                        SQL_STATE_CODE
                );
            }

            registerDriver(
                    dataSourceId,
                    currentDescriptor
            );

            return connection;
        } catch (SQLException e) {
            throw new SQLException(
                    "Cannot create JDBC connection: "
                            + e.getMessage(),
                    SQL_STATE_CODE,
                    e
            );
        }
    }

    private void registerDriver(
            DataSourceId dataSourceId,
            DriverDescriptor currentDescriptor) {

        String key = dataSourceId.value();

        DriverDescriptor previousDescriptor =
                activeDrivers.put(key, currentDescriptor);

        if (previousDescriptor == null) {
            return;
        }

        if (!sameDriver(
                previousDescriptor,
                currentDescriptor
        )) {
            driverProvider.release(
                    dataSourceId,
                    previousDescriptor
            );
        }
    }

    @Override
    public void release(DataSourceId dataSourceId) {
        if (dataSourceId == null) {
            return;
        }

        DriverDescriptor descriptor =
                activeDrivers.remove(dataSourceId.value());

        if (descriptor != null) {
            driverProvider.release(
                    dataSourceId,
                    descriptor
            );
        }
    }

    @Override
    public void shutdown() {
        activeDrivers.clear();
        driverProvider.shutdown();
    }

    private void validateConfig(
            DataSourceConfig config) throws SQLException {

        if (config == null) {
            throw new SQLException(
                    "DataSourceConfig cannot be null",
                    SQL_STATE_CODE
            );
        }

        if (config.getUrl() == null
                || config.getUrl().trim().isEmpty()) {
            throw new SQLException(
                    "JDBC URL cannot be empty",
                    SQL_STATE_CODE
            );
        }

        if (config.getDriver() == null) {
            throw new SQLException(
                    "Driver descriptor cannot be null",
                    SQL_STATE_CODE
            );
        }
    }

    private boolean sameDriver(
            DriverDescriptor left,
            DriverDescriptor right) {

        return left.getDriverClass()
                .equals(right.getDriverClass())
                && left.getFingerprint()
                .equals(right.getFingerprint());
    }
}
