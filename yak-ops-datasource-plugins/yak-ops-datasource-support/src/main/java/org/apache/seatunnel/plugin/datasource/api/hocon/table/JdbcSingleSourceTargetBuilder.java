package org.apache.seatunnel.plugin.datasource.api.hocon.table;

import com.typesafe.config.Config;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.jdbc.JdbcConfigReaders;
import io.baize.flow.common.enums.HoconBuildStage;
import io.baize.flow.common.modal.JdbcQueryRenderContext;

import java.util.List;
import java.util.Map;
import java.util.function.BiFunction;

import static org.apache.seatunnel.plugin.datasource.api.hocon.JdbcBatchConstants.*;

public class JdbcSingleSourceTargetBuilder implements JdbcSourceTargetBuilder {

    private final JdbcTableNameResolver tableNameResolver;
    private final BiFunction<String, JdbcQueryRenderContext, String> queryRenderHandler;

    public JdbcSingleSourceTargetBuilder(
            JdbcTableNameResolver tableNameResolver,
            BiFunction<String, JdbcQueryRenderContext, String> queryRenderHandler) {
        this.tableNameResolver = tableNameResolver;
        this.queryRenderHandler = queryRenderHandler;
    }

    @Override
    public void build(Config config,
                      Config conn,
                      Map<String, Object> map,
                      HoconBuildStage stage) {
        String sql = JdbcConfigReaders.getString(config, SQL, "");
        if (StringUtils.isNotBlank(sql)) {
            JdbcQueryRenderContext renderContext =
                    new JdbcQueryRenderContext(config, conn, stage, null);

            map.put(QUERY, queryRenderHandler.apply(sql, renderContext));
            return;
        }

        String database = tableNameResolver.resolveDatabase(config, conn);
        String schema = tableNameResolver.resolveSchema(config, conn);

        List<String> sourceTables = tableNameResolver.resolveSourceTableNames(config);
        String tablePath = resolveTablePath(config, conn, database, schema, sourceTables);

        if (StringUtils.isBlank(tablePath)) {
            throw new IllegalArgumentException(
                    "Missing source table, one of query/table_path/table/table_list is required");
        }

        if (StringUtils.isNotBlank(database)) {
            map.put(DATABASE, database.trim());
        }
        map.put(TABLE_PATH, tablePath);
    }

    private String resolveTablePath(
            Config config,
            Config conn,
            String database,
            String schema,
            List<String> sourceTables) {
        String tablePath = JdbcConfigReaders.getString(config, TABLE_PATH, "");
        if (StringUtils.isNotBlank(tablePath)) {
            String trimmed = tablePath.trim();

            return tableNameResolver.normalizeSourceTablePath(config, conn, database, schema, trimmed);
        }

        String table = JdbcConfigReaders.getString(config, TABLE, "");
        if (StringUtils.isBlank(table)) {
            table = tableNameResolver.firstTable(sourceTables);
        }

        if (StringUtils.isBlank(table)) {
            return "";
        }

        String trimmed = table.trim();
        return tableNameResolver.normalizeSourceTablePath(config, conn, database, schema, trimmed);
    }
}
