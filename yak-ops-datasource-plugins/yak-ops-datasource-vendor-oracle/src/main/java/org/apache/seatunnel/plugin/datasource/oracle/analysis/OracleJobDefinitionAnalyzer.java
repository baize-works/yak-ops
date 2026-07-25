package org.apache.seatunnel.plugin.datasource.oracle.analysis;

import org.apache.seatunnel.plugin.datasource.api.analysis.jdbc.AbstractJdbcJobDefinitionAnalyzer;
import io.yak.ops.plugin.spi.enums.DbType;

public class OracleJobDefinitionAnalyzer extends AbstractJdbcJobDefinitionAnalyzer {

    @Override
    protected DbType dbType() {
        return DbType.ORACLE;
    }

    @Override
    protected String[] guideSingleSourceTableKeys() {
        return new String[]{
                "table_path",
                "schema.table",
                "table",
                "table_name"
        };
    }

    @Override
    protected String[] guideSingleSinkTableKeys() {
        return new String[]{
                "targetTableName",
                "table_path",
                "table",
                "table_name"
        };
    }

    @Override
    protected String normalizeTable(String raw) {
        String value = super.normalizeTable(raw);

        /*
         * Oracle 表名很多时候是大写展示。
         * 这里是否转大写要谨慎：
         * 如果用户配置了带引号的大小写敏感表名，不应该强行 upper。
         *
         * 所以默认先不转。
         */
        return value;
    }
}
