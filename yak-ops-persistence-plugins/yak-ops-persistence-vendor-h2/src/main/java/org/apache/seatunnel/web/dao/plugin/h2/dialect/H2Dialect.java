package io.yak.ops.dao.plugin.h2.dialect;


import io.yak.ops.dao.plugin.api.dialect.DatabaseDialect;

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
