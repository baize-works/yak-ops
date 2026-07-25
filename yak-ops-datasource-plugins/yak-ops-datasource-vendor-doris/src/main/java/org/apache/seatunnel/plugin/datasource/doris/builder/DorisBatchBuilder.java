package org.apache.seatunnel.plugin.datasource.doris.builder;

import com.google.auto.service.AutoService;
import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.constants.DataSourceConstants;
import org.apache.seatunnel.plugin.datasource.api.hocon.DataSourceHoconBuilder;
import org.apache.seatunnel.plugin.datasource.api.hocon.HoconBuildContext;
import org.apache.seatunnel.plugin.datasource.api.jdbc.AbstractJdbcHoconBuilder;
import org.apache.seatunnel.plugin.datasource.api.jdbc.JdbcConfigReaders;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Doris HOCON 构建器。
 *
 * <p>Doris 使用双端口架构：</p>
 * <ul>
 *   <li><b>fenodes</b> (FE HTTP端口, 默认8030) — 用于 StreamLoad 方式读写数据</li>
 *   <li><b>queryPort</b> (MySQL协议端口, 默认9030) — 用于 JDBC 元数据查询</li>
 * </ul>
 *
 * <p>此构建器输出的 HOCON 包含 fenodes 字段，用于 Doris 连接器的 StreamLoad 数据读写。</p>
 */
@AutoService(DataSourceHoconBuilder.class)
public class DorisBatchBuilder extends AbstractJdbcHoconBuilder implements DataSourceHoconBuilder {

    private static final String FENODES = "fenodes";

    @Override
    public String pluginName() {
        return "DORIS";
    }

    @Override
    protected String defaultDriver() {
        return DataSourceConstants.COM_MYSQL_CJ_JDBC_DRIVER;
    }

    @Override
    public Config buildSourceHocon(HoconBuildContext context) {
        Config conn = context.getConnectionConfig();
        Config config = context.getNodeConfig();

        Map<String, Object> map = new HashMap<>(16);

        // Doris 源连接器使用 fenodes (FE HTTP端口) 进行数据读取
        putDorisConnConfig(conn, map);

        if (isMultiTableMode(config)) {
            putMultiTableSourceConfig(config, conn, map);
        } else {
            putSingleTableSourceConfig(config, conn, map);
        }

        // 通用表单字段映射到 Doris 专属参数
        putDorisSourceOptions(config, map);

        return ConfigFactory.parseMap(map);
    }

    @Override
    public Config buildSinkHocon(HoconBuildContext context) {
        Config conn = context.getConnectionConfig();
        Config config = context.getNodeConfig();

        Map<String, Object> map = new HashMap<>(16);

        // Doris sink 使用 fenodes (FE HTTP端口) 通过 StreamLoad 写入数据
        putDorisConnConfig(conn, map);

        if (isMultiTableMode(config)) {
            putMultiTableSinkConfig(config, conn, map);
        } else {
            putTableConfig(config, conn, map);
        }

        putDorisSinkConfig(config, map, context);

        return ConfigFactory.parseMap(map);
    }

    // ======================== Mode Detection ========================

    private boolean isMultiTableMode(Config config) {
        if (JdbcConfigReaders.getBoolean(config, "multiTable", false)) {
            return true;
        }
        List<String> tableList = getTableList(config);
        return tableList.size() > 1;
    }

    private List<String> getTableList(Config config) {
        List<String> result = new ArrayList<>();
        try {
            if (config.hasPath("table_list")) {
                result.addAll(config.getStringList("table_list"));
            }
        } catch (Exception e) {
            // ignore
        }
        if (result.isEmpty()) {
            try {
                if (config.hasPath("source_table_list")) {
                    result.addAll(config.getStringList("source_table_list"));
                }
            } catch (Exception e) {
                // ignore
            }
        }
        return result;
    }

    // ======================== Single Table Source ========================

    /**
     * 单表 Source 配置：database + table + 可选的 doris.filter.query（从 SQL WHERE 提取）。
     */
    private void putSingleTableSourceConfig(Config config, Config conn, Map<String, Object> map) {
        String database = JdbcConfigReaders.getString(config, "database", "");
        if (database.isEmpty()) {
            database = JdbcConfigReaders.getString(conn, "database", "");
        }
        if (!database.isEmpty()) {
            map.put("database", database);
        }

        String table = JdbcConfigReaders.getString(config, "table", "");
        if (!table.isEmpty()) {
            map.put("table", table);
        }

        // 自定义 SQL 模式：提取 WHERE 后的内容作为 doris.filter.query
        String sql = JdbcConfigReaders.getString(config, "sql", "");
        if (StringUtils.isNotBlank(sql)) {
            String filterQuery = extractWhereClause(sql);
            if (StringUtils.isNotBlank(filterQuery)) {
                map.put("doris.filter.query", filterQuery);
            }
            return;
        }

        // 按表模式：检查是否有直接的 doris.filter.query
        String filterQuery = JdbcConfigReaders.getString(config, "doris.filter.query", "");
        if (!filterQuery.isEmpty()) {
            map.put("doris.filter.query", filterQuery);
        }
    }

    // ======================== Multi Table Source ========================

    /**
     * 多表 Source 配置：使用 Doris 原生 table_list 格式（每项用 database + table 分离）。
     */
    private void putMultiTableSourceConfig(Config config, Config conn, Map<String, Object> map) {
        String database = JdbcConfigReaders.getString(config, "database", "");
        if (database.isEmpty()) {
            database = JdbcConfigReaders.getString(conn, "database", "");
        }
        if (!database.isEmpty()) {
            map.put("database", database);
        }

        List<String> tables = getTableList(config);
        if (tables.isEmpty()) {
            throw new IllegalArgumentException(
                    "Missing table_list for Doris multi-table source");
        }

        List<Map<String, Object>> tableList = new ArrayList<>();
        for (String table : tables) {
            if (StringUtils.isBlank(table)) {
                continue;
            }
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("database", database);
            item.put("table", table.trim());
            tableList.add(item);
        }

        if (!tableList.isEmpty()) {
            map.put("table_list", tableList);
        }
    }

    // ======================== Multi Table Sink ========================

    /**
     * 多表 Sink 配置：使用 ${table_name} 动态表名。
     */
    private void putMultiTableSinkConfig(Config config, Config conn, Map<String, Object> map) {
        String database = JdbcConfigReaders.getString(config, "database", "");
        if (database.isEmpty()) {
            database = JdbcConfigReaders.getString(conn, "database", "");
        }
        if (!database.isEmpty()) {
            map.put("database", database);
        }

        map.put("table", "${table_name}");
    }

    /**
     * 构建 Doris 连接配置，包含 fenodes、username、password。
     */
    private void putDorisConnConfig(Config conn, Map<String, Object> map) {
        // fenodes - FE HTTP地址，用于 StreamLoad 读写
        String fenodes = JdbcConfigReaders.getString(conn, FENODES, "");
        if (!fenodes.isEmpty()) {
            map.put(FENODES, fenodes);
        }

        // username / password
        String username = JdbcConfigReaders.getString(conn, "user", "");
        if (!username.isEmpty()) {
            map.put("username", username);
        }

        String password = JdbcConfigReaders.getString(conn, "password", "");
        if (!password.isEmpty()) {
            map.put("password", password);
        }
    }

    // ======================== Source Option Mapping ========================

    /**
     * 将通用表单字段映射为 Doris Source 专属参数。
     *
     * <p>通用表单的 fetchSize / splitSize 是 JDBC 概念，Doris 不使用。
     * 这里将 fetchSize 自动映射为 doris.batch.size（语义最接近），
     * splitSize 在 Doris 中无对应概念，直接忽略。</p>
     */
    private void putDorisSourceOptions(Config config, Map<String, Object> map) {
        // 优先使用直接配置的 doris.batch.size
        Integer dorisBatchSize = JdbcConfigReaders.getInteger(config, "doris.batch.size", null);
        if (dorisBatchSize != null && dorisBatchSize > 0) {
            map.put("doris.batch.size", dorisBatchSize);
            return;
        }

        // 退而使用通用表单的 fetchSize
        Integer fetchSize = JdbcConfigReaders.getInteger(config, "fetchSize", null);
        if (fetchSize != null && fetchSize > 0) {
            map.put("doris.batch.size", fetchSize);
        }
    }

    // ======================== WHERE Extraction ========================

    /**
     * 从 SQL 中简单截取 WHERE 关键字后的内容作为过滤条件。
     * 不处理子查询、ORDER BY 等复杂语法。
     */
    private String extractWhereClause(String sql) {
        if (StringUtils.isBlank(sql)) {
            return "";
        }
        String upperSql = sql.trim().toUpperCase();
        int whereIdx = upperSql.lastIndexOf("WHERE");
        if (whereIdx < 0) {
            return "";
        }
        return sql.trim().substring(whereIdx + 5).trim();
    }

    /**
     * 构建单表表配置 (database / table / doris.filter.query)。
     */
    private void putTableConfig(Config config, Config conn, Map<String, Object> map) {
        String database = JdbcConfigReaders.getString(config, "database", "");
        if (database.isEmpty()) {
            database = JdbcConfigReaders.getString(conn, "database", "");
        }
        if (!database.isEmpty()) {
            map.put("database", database);
        }

        String table = JdbcConfigReaders.getString(config, "table", "");
        if (!table.isEmpty()) {
            map.put("table", table);
        }

        // doris.filter.query — Doris Source 插件的数据过滤参数
        String filterQuery = JdbcConfigReaders.getString(config, "doris.filter.query", "");
        if (!filterQuery.isEmpty()) {
            map.put("doris.filter.query", filterQuery);
        }
    }

    /**
     * 构建 Doris sink 特有配置。
     * 前端通用表单可能不传 sink.label-prefix / doris.config，后端自动填充默认值。
     */
    private void putDorisSinkConfig(Config config, Map<String, Object> map, HoconBuildContext context) {
        // sink.label-prefix — 必填，前端未传则自动生成
        String labelPrefix = JdbcConfigReaders.getString(config, "sink.label-prefix", "");
        if (labelPrefix.isEmpty()) {
            labelPrefix = "seatunnel_" + System.currentTimeMillis();
        }
        map.put("sink.label-prefix", labelPrefix);

        Boolean enable2pc = JdbcConfigReaders.getBoolean(config, "sink.enable-2pc", false);
        if (enable2pc) {
            map.put("sink.enable-2pc", "true");
        }

        Boolean enableDelete = JdbcConfigReaders.getBoolean(config, "sink.enable-delete", null);
        if (enableDelete != null) {
            map.put("sink.enable-delete", enableDelete.toString());
        }

        // schema_save_mode — 默认 CREATE_SCHEMA_WHEN_NOT_EXIST
        String schemaSaveMode = JdbcConfigReaders.getString(config, "schema_save_mode", "");
        if (schemaSaveMode.isEmpty()) {
            schemaSaveMode = "CREATE_SCHEMA_WHEN_NOT_EXIST";
        }
        map.put("schema_save_mode", schemaSaveMode);

        String dataSaveMode = JdbcConfigReaders.getString(config, "data_save_mode", "");
        if (!dataSaveMode.isEmpty()) {
            map.put("data_save_mode", dataSaveMode);
        }

        // doris.batch.size — 通用表单的 batchSize/batch_size 映射到 Doris 专属参数
        Integer dorisBatchSize = JdbcConfigReaders.getInteger(config, "doris.batch.size", null);
        if (dorisBatchSize == null || dorisBatchSize <= 0) {
            dorisBatchSize = JdbcConfigReaders.getInteger(config, "batchSize", null);
        }
        if (dorisBatchSize == null || dorisBatchSize <= 0) {
            dorisBatchSize = JdbcConfigReaders.getInteger(config, "batch_size", null);
        }
        if (dorisBatchSize != null && dorisBatchSize > 0) {
            map.put("doris.batch.size", dorisBatchSize);
        }

        // doris.config — 必填，前端未传则使用 JSON 格式默认值
        Map<String, Object> dorisConfig = new HashMap<>();
        JdbcConfigReaders.appendConfigObject(config, "doris.config", dorisConfig);
        if (dorisConfig.isEmpty()) {
            dorisConfig.put("format", "json");
            dorisConfig.put("read_json_by_line", "true");
        }
        map.put("doris.config", dorisConfig);

        // save_mode_create_template — 条件守卫：仅在需要建表时注入模板
        // 模板优先级：用户显式填写 > Doris 默认模板 > 不输出
        if ("CREATE_SCHEMA_WHEN_NOT_EXIST".equals(schemaSaveMode)
                || "RECREATE_SCHEMA".equals(schemaSaveMode)) {
            String template = JdbcConfigReaders.getString(config, "save_mode_create_template", "");
            if (template.isEmpty()) {
                template = defaultCreateTableTemplate();
            }
            if (template != null && !template.isEmpty()) {
                map.put("save_mode_create_template", template);
            }
        }
    }

    @Override
    public String sourceTemplate() {
        return ""
                + "  Doris {\n"
                + "    datasourceId = @\n"
                + "    fenodes = \"127.0.0.1:8030\"\n"
                + "    database = \"demo\"\n"
                + "    table = \"user\"\n"
                + "  }\n";
    }

    @Override
    public String sinkTemplate() {
        return ""
                + "  Doris {\n"
                + "    datasourceId = @\n"
                + "    fenodes = \"127.0.0.1:8030\"\n"
                + "    database = \"demo\"\n"
                + "    table = \"user_sink\"\n"
                + "    sink.label-prefix = \"test\"\n"
                + "    sink.enable-2pc = \"true\"\n"
                + "    doris.config {\n"
                + "      format = \"json\"\n"
                + "      read_json_by_line = \"true\"\n"
                + "    }\n"
                + "  }\n";
    }

    /**
     * Doris OLAP 专属建表模板。
     *
     * <p>与 JDBC 关系型模板完全不同：
     * <ul>
     *   <li>ENGINE=OLAP — Doris 列存引擎</li>
     *   <li>UNIQUE KEY — 支持 upsert 语义</li>
     *   <li>DISTRIBUTED BY HASH — 数据分桶策略</li>
     *   <li>replication_allocation — 副本数</li>
     * </ul>
     */
    public String defaultCreateTableTemplate() {
        return "CREATE TABLE IF NOT EXISTS `${database}`.`${table_name}` (\n"
                + "    ${rowtype_primary_key},\n"
                + "    ${rowtype_fields}\n"
                + ") ENGINE=OLAP\n"
                + "    UNIQUE KEY (${rowtype_primary_key})\n"
                + "    COMMENT '${comment}'\n"
                + "    DISTRIBUTED BY HASH (${rowtype_primary_key})\n"
                + "    PROPERTIES (\n"
                + "        \"replication_allocation\" = \"tag.location.default: 1\",\n"
                + "        \"in_memory\" = \"false\",\n"
                + "        \"storage_format\" = \"V2\",\n"
                + "        \"disable_auto_compaction\" = \"false\"\n"
                + "    )";
    }
}
