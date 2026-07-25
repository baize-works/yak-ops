package io.baize.flow.dao.plugin.mysql.dialect;

import lombok.SneakyThrows;
import io.baize.flow.dao.plugin.api.dialect.DatabaseDialect;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;

public class MysqlDialect implements DatabaseDialect {

    private final DataSource dataSource;

    public MysqlDialect(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @SneakyThrows
    @Override
    public boolean tableExists(String tableName) {
        try (
                Connection conn = dataSource.getConnection();
                ResultSet rs = conn.getMetaData().getTables(conn.getCatalog(), conn.getSchema(), tableName, null)) {
            return rs.next();
        }
    }

    @SneakyThrows
    @Override
    public boolean columnExists(String tableName, String columnName) {
        try (
                Connection conn = dataSource.getConnection();
                ResultSet rs =
                        conn.getMetaData().getColumns(conn.getCatalog(), conn.getSchema(), tableName, columnName)) {
            return rs.next();

        }
    }
}
