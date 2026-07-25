package io.baize.flow.dao.plugin.api.dialect;

public interface DatabaseDialect {

    boolean tableExists(String tableName);

    boolean columnExists(String tableName, String columnName);

}
