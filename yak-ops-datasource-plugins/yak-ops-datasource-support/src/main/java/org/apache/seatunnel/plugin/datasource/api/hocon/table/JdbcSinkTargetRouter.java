package org.apache.seatunnel.plugin.datasource.api.hocon.table;

import com.typesafe.config.Config;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.jdbc.JdbcConfigReaders;

import java.util.List;
import java.util.Map;
import static org.apache.seatunnel.plugin.datasource.api.hocon.JdbcBatchConstants.SQL;

public class JdbcSinkTargetRouter {

    private final JdbcTableNameResolver tableNameResolver;
    private final JdbcSinkTargetBuilder singleBuilder;
    private final JdbcSinkTargetBuilder multiBuilder;

    public JdbcSinkTargetRouter(JdbcTableNameResolver tableNameResolver,
                                JdbcSinkTargetBuilder singleBuilder,
                                JdbcSinkTargetBuilder multiBuilder) {
        this.tableNameResolver = tableNameResolver;
        this.singleBuilder = singleBuilder;
        this.multiBuilder = multiBuilder;
    }

    public void build(Config config,
                      Config conn,
                      Map<String, Object> map) {
        String sql = JdbcConfigReaders.getString(config, SQL, "");

        /*
         * 自定义 SQL 写入场景，直接交给单表 builder。
         */
        if (StringUtils.isNotBlank(sql)) {
            singleBuilder.build(config, conn, map);
            return;
        }

        List<String> sinkTables = tableNameResolver.resolveSinkTableNames(config);
        JdbcTableMode mode = tableNameResolver.resolveTableMode(config, sinkTables);

        if (mode == JdbcTableMode.MULTI) {
            multiBuilder.build(config, conn, map);
            return;
        }

        singleBuilder.build(config, conn, map);
    }
}