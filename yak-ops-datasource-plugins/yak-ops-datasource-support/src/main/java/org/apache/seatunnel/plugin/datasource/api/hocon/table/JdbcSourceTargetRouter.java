package org.apache.seatunnel.plugin.datasource.api.hocon.table;

import com.typesafe.config.Config;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.jdbc.JdbcConfigReaders;
import io.baize.flow.common.enums.HoconBuildStage;
import static org.apache.seatunnel.plugin.datasource.api.hocon.JdbcBatchConstants.*;
import java.util.List;
import java.util.Map;



public class JdbcSourceTargetRouter {

    private final JdbcTableNameResolver tableNameResolver;
    private final JdbcSourceTargetBuilder singleBuilder;
    private final JdbcSourceTargetBuilder multiBuilder;

    public JdbcSourceTargetRouter(JdbcTableNameResolver tableNameResolver,
                                  JdbcSourceTargetBuilder singleBuilder,
                                  JdbcSourceTargetBuilder multiBuilder) {
        this.tableNameResolver = tableNameResolver;
        this.singleBuilder = singleBuilder;
        this.multiBuilder = multiBuilder;
    }

    public void build(Config config,
                      Config conn,
                      Map<String, Object> map,
                      HoconBuildStage stage) {
        String sql = JdbcConfigReaders.getString(config, SQL, "");

        /*
         * 有 SQL 时，优先走单表 builder。
         * 因为 query 场景不需要 table_list。
         */
        if (StringUtils.isNotBlank(sql)) {
            singleBuilder.build(config, conn, map, stage);
            return;
        }

        List<String> sourceTables = tableNameResolver.resolveSourceTableNames(config);
        JdbcTableMode mode = tableNameResolver.resolveTableMode(config, sourceTables);

        if (mode == JdbcTableMode.MULTI) {
            multiBuilder.build(config, conn, map, stage);
            return;
        }

        singleBuilder.build(config, conn, map, stage);
    }
}