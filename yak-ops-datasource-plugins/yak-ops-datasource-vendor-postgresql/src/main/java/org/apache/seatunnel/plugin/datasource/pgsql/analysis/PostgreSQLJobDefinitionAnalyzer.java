package org.apache.seatunnel.plugin.datasource.pgsql.analysis;


import org.apache.seatunnel.plugin.datasource.api.analysis.jdbc.AbstractJdbcJobDefinitionAnalyzer;
import io.baize.flow.plugin.spi.enums.DbType;

public class PostgreSQLJobDefinitionAnalyzer extends AbstractJdbcJobDefinitionAnalyzer {

    @Override
    protected DbType dbType() {
        return DbType.POSTGRE_SQL;
    }

    @Override
    protected String[] guideSingleSourceTableKeys() {
        return new String[]{
                "table_path",
                "table",
                "table_name"
        };
    }

    @Override
    protected String[] guideSingleSinkTableKeys() {
        return new String[]{
                "targetTableName",
                "table",
                "table_path",
                "table_name"
        };
    }
}
