package org.apache.seatunnel.plugin.datasource.api.hocon.table;

import com.typesafe.config.Config;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import io.baize.flow.common.enums.HoconBuildStage;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.apache.seatunnel.plugin.datasource.api.hocon.JdbcBatchConstants.*;

public class JdbcMultiSourceTargetBuilder implements JdbcSourceTargetBuilder {

    private final JdbcTableNameResolver tableNameResolver;

    public JdbcMultiSourceTargetBuilder(JdbcTableNameResolver tableNameResolver) {
        this.tableNameResolver = tableNameResolver;
    }

    @Override
    public void build(Config config,
                      Config conn,
                      Map<String, Object> map,
                      HoconBuildStage stage) {
        String database = tableNameResolver.resolveDatabase(config, conn);
        String schema = tableNameResolver.resolveSchema(config, conn);

        List<String> sourceTables = tableNameResolver.resolveSourceTableNames(config);
        List<Map<String, Object>> tableList = buildSourceTableList(config, conn, database, schema, sourceTables);

        if (CollectionUtils.isEmpty(tableList)) {
            throw new IllegalArgumentException("Missing source table_list, table_list can not be empty");
        }

        if (StringUtils.isNotBlank(database)) {
            map.put(DATABASE, database.trim());
        }
        map.put(TABLE_LIST, tableList);
    }

    private List<Map<String, Object>> buildSourceTableList(
            Config config,
            Config conn,
            String database,
            String schema,
            List<String> sourceTables) {
        List<Map<String, Object>> tableList = new ArrayList<>();

        for (String table : sourceTables) {
            if (StringUtils.isBlank(table)) {
                continue;
            }

            String tablePath = tableNameResolver.normalizeSourceTablePath(
                    config,
                    conn,
                    database,
                    schema,
                    table.trim());

            Map<String, Object> item = new LinkedHashMap<>();
            item.put(TABLE_PATH, tablePath);
            tableList.add(item);
        }

        return tableList;
    }
}
