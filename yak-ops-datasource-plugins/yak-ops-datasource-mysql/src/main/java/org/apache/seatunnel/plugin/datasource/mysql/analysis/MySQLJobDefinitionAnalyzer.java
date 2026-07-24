package org.apache.seatunnel.plugin.datasource.mysql.analysis;

import org.apache.seatunnel.plugin.datasource.api.analysis.jdbc.AbstractJdbcJobDefinitionAnalyzer;
import io.baize.flow.plugin.spi.enums.DbType;

public class MySQLJobDefinitionAnalyzer extends AbstractJdbcJobDefinitionAnalyzer {

    @Override
    protected DbType dbType() {
        return DbType.MYSQL;
    }

    @Override
    protected String[] guideSingleSourceTableKeys() {
        return new String[]{
                "table",
                "table_path",
                "table_name"
        };
    }

    @Override
    protected String[] guideSingleSinkTableKeys() {
        return new String[]{
                "targetTableName",
                "table",
                "table_path"
        };
    }
}