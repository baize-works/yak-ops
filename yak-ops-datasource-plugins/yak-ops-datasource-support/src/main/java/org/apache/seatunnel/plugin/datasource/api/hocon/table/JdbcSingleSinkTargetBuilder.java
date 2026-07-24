package org.apache.seatunnel.plugin.datasource.api.hocon.table;

import com.typesafe.config.Config;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.jdbc.JdbcConfigReaders;

import java.util.List;
import java.util.Map;

import static org.apache.seatunnel.plugin.datasource.api.hocon.JdbcBatchConstants.*;

public class JdbcSingleSinkTargetBuilder implements JdbcSinkTargetBuilder {

    private final JdbcTableNameResolver tableNameResolver;

    public JdbcSingleSinkTargetBuilder(JdbcTableNameResolver tableNameResolver) {
        this.tableNameResolver = tableNameResolver;
    }

    @Override
    public void build(Config config,
                      Config conn,
                      Map<String, Object> map) {
        String sql = JdbcConfigReaders.getString(config, SQL, "");
        if (StringUtils.isNotBlank(sql)) {
            map.put(QUERY, sql);
            map.put(GENERATE_SINK_SQL, false);
            return;
        }

        String database = JdbcConfigReaders.getString(config, DATABASE, "");
        String table = JdbcConfigReaders.getString(config, TABLE, "");
        String targetTableName = JdbcConfigReaders.getString(config, TARGET_TABLE_NAME, "");

        List<String> sinkTables = tableNameResolver.resolveSinkTableNames(config);

        String finalDatabase = resolveFinalDatabase(conn, database);
        String finalTable = resolveFinalTable(table, targetTableName, sinkTables);
        finalTable = JdbcSinkSchemaResolver.normalizeSingleTable(config, conn, finalDatabase, finalTable);
        finalTable = JdbcOracleSchemaResolver.normalizeSingleTable(config, conn, finalTable);

        if (StringUtils.isBlank(finalTable)) {
            throw new IllegalArgumentException(
                    "Missing sink target, one of query/targetTableName/table is required");
        }

        if (StringUtils.isNotBlank(finalDatabase)) {
            map.put(DATABASE, finalDatabase);
        }

        map.put(TABLE, finalTable);
        map.put(GENERATE_SINK_SQL, true);
    }

    private String resolveFinalTable(String table,
                                     String targetTableName,
                                     List<String> sinkTables) {
        if (StringUtils.isNotBlank(targetTableName)) {
            return targetTableName.trim();
        }

        if (StringUtils.isNotBlank(table)) {
            return table.trim();
        }

        return tableNameResolver.firstTable(sinkTables);
    }

    private String resolveFinalDatabase(Config conn, String database) {
        if (StringUtils.isNotBlank(database)) {
            return database.trim();
        }

        String targetDatabase = JdbcConfigReaders.getString(conn, DATABASE, "");
        if (StringUtils.isNotBlank(targetDatabase)) {
            return targetDatabase.trim();
        }

        return "";
    }
}
