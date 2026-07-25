package io.baize.flow.dao.plugin.h2.dialect;


import io.baize.flow.dao.plugin.api.dialect.DatabaseDialect;

public class H2Dialect implements DatabaseDialect {

    @Override
    public boolean tableExists(String tableName) {
        throw new UnsupportedOperationException();
    }

    @Override
    public boolean columnExists(String tableName, String columnName) {
        throw new UnsupportedOperationException();
    }
}
