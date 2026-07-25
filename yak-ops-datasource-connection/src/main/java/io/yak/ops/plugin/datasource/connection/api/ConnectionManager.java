package io.yak.ops.plugin.datasource.connection.api;

import java.sql.Connection;
import java.sql.SQLException;

public interface ConnectionManager {
    Connection getConnection(DataSourceConfig config) throws SQLException;

    void release(DataSourceId dataSourceId);

    void shutdown();
}

