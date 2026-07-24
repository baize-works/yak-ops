package org.apache.seatunnel.plugin.datasource.api.hocon.table;

import com.typesafe.config.Config;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.jdbc.JdbcConfigReaders;

import java.util.Map;

import static org.apache.seatunnel.plugin.datasource.api.hocon.JdbcBatchConstants.*;

public class JdbcMultiSinkTargetBuilder implements JdbcSinkTargetBuilder {

    @Override
    public void build(Config config,
                      Config conn,
                      Map<String, Object> map) {
        String tablePattern = JdbcConfigReaders.getString(config, TABLE_PATTERN, "");
        String finalTable = StringUtils.isNotBlank(tablePattern)
                ? tablePattern.trim()
                : JdbcSinkSchemaResolver.defaultMultiTablePattern(config, conn);
        if (StringUtils.isBlank(tablePattern)) {
            finalTable = JdbcOracleSchemaResolver.defaultMultiTablePattern(config, conn, finalTable);
        }

        String finalDatabase = resolveFinalDatabase(config, conn);

        if (StringUtils.isNotBlank(finalDatabase)) {
            map.put(DATABASE, finalDatabase);
        }

        map.put(TABLE, finalTable);
        map.put(GENERATE_SINK_SQL, true);
    }

    private String resolveFinalDatabase(Config config, Config conn) {
        String database = JdbcConfigReaders.getString(config, DATABASE, "");
        if (StringUtils.isNotBlank(database)) {
            return database.trim();
        }

        String databasePattern = JdbcConfigReaders.getString(config, DATABASE_PATTERN, "");
        if (StringUtils.isNotBlank(databasePattern)) {
            return databasePattern.trim();
        }

        String connDatabase = JdbcConfigReaders.getString(conn, DATABASE, "");
        if (StringUtils.isNotBlank(connDatabase)) {
            return connDatabase.trim();
        }

        return "";
    }
}
