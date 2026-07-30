package io.yak.ops.business.sync.offline.engine;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.datasource.dao.DataSourceDao;
import io.yak.ops.common.bean.po.datasource.DataSourcePO;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/** 将 Yak Ops 离线任务编辑模型转换为 Link-Up 可提交的 HOCON。 */
@ConditionalOnOfflineSyncEnabled
@Component
public class LinkUpHoconBuilder {

  private final DataSourceDao dataSourceDao;
  private final ObjectMapper objectMapper;

  public LinkUpHoconBuilder(
      DataSourceDao dataSourceDao,
      @Qualifier("offlineSyncJsonMapper") ObjectMapper objectMapper) {
    this.dataSourceDao = dataSourceDao;
    this.objectMapper = objectMapper;
  }

  public BuildResult build(JsonNode definition) {
    requireObject(definition, "任务定义不能为空");
    JsonNode basic = definition.path("basic");
    JsonNode workflow = definition.path("workflow");
    requireObject(basic, "basic 配置不能为空");
    requireObject(workflow, "workflow 配置不能为空");

    String jobName = requiredText(basic, "jobName", "任务名称不能为空");
    String mode = text(basic, "mode", text(definition, "mode", "GUIDE_SINGLE"));
    if (!"GUIDE_SINGLE".equals(mode) && !"GUIDE_MULTI".equals(mode)) {
      throw new IllegalArgumentException("Link-Up 当前仅支持 GUIDE_SINGLE 和 GUIDE_MULTI 模式");
    }

    Endpoint source = endpoint(workflow, "source");
    Endpoint sink = endpoint(workflow, "sink");
    long sourceDataSourceId = resolveDataSourceId(source.config, basic, workflow, true);
    long sinkDataSourceId = resolveDataSourceId(sink.config, basic, workflow, false);
    DataSourcePO sourceDataSource = dataSource(sourceDataSourceId, "来源端");
    DataSourcePO sinkDataSource = dataSource(sinkDataSourceId, "目标端");
    ConnectionDetails sourceConnection = connection(sourceDataSource);
    ConnectionDetails sinkConnection = connection(sinkDataSource);

    List<String> sourceTables = sourceTables(source.config, mode, jobName);
    String sourceQuery = sourceQuery(source.config);
    String sinkTableTemplate = sinkTable(sink.config, mode, sourceTables);
    String sourceTableView = tableView(sourceTables, mode);
    String sinkTableView = sinkTableView(sinkTableTemplate, sourceTables, mode);

    int parallelism = Math.max(1, definition.path("env").path("parallelism").asInt(1));
    int channelCapacity = Math.max(1, definition.path("env").path("channelCapacity").asInt(64));
    int batchSize = Math.max(1, sink.config.path("batchSize").asInt(1000));
    int fetchSize = Math.max(1, source.config.path("fetchSize").asInt(batchSize));
    JsonNode channelConfig = workflow.path("channelConfig");

    StringBuilder hocon = new StringBuilder(1024);
    line(hocon, "job.name = " + quote(jobName));
    hocon.append('\n').append("env {\n");
    line(hocon, 1, "source-parallelism = " + parallelism);
    line(hocon, 1, "sink-parallelism = " + parallelism);
    if ("GUIDE_MULTI".equals(mode)) {
      line(hocon, 1, "pipeline-parallelism = " + parallelism);
    }
    line(hocon, 1, "channel-capacity = " + channelCapacity);
    hocon.append("}\n\n");

    hocon.append("source {\n");
    line(hocon, 1, "type = \"jdbc\"");
    line(hocon, 1, "batch-size = " + fetchSize);
    appendConnection(hocon, sourceConnection);
    line(hocon, 1, "fetch_size = " + fetchSize);
    if ("GUIDE_MULTI".equals(mode)) {
      line(hocon, 1, "table_list = " + tableList(sourceTables));
    } else {
      line(hocon, 1, "table_path = " + quote(sourceTables.get(0)));
      if (StringUtils.hasText(sourceQuery)) {
        line(hocon, 1, "query = " + quote(sourceQuery));
      }
    }
    String whereCondition = text(source.config, "whereCondition", null);
    if (StringUtils.hasText(whereCondition)) {
      line(hocon, 1, "where_condition = " + quote(whereCondition));
    }
    hocon.append("}\n\n");

    hocon.append("sink {\n");
    line(hocon, 1, "type = \"jdbc\"");
    appendConnection(hocon, sinkConnection);
    line(hocon, 1, "table_path = " + quote(sinkTableTemplate));
    line(
        hocon,
        1,
        "schema_save_mode = "
            + (sink.config.path("autoCreateTable").asBoolean(false)
                ? "CREATE_SCHEMA_WHEN_NOT_EXIST"
                : "ERROR_WHEN_SCHEMA_NOT_EXIST"));
    String writeMode = text(sink.config, "writeMode", "append").toLowerCase(Locale.ROOT);
    line(hocon, 1, "data_save_mode = " + ("overwrite".equals(writeMode) ? "DROP_DATA" : "APPEND_DATA"));
    line(hocon, 1, "write_mode = " + ("upsert".equals(writeMode) ? "UPSERT" : "INSERT"));
    if ("upsert".equals(writeMode)) {
      List<String> primaryKeys = splitValues(text(sink.config, "primaryKey", null));
      if (primaryKeys.isEmpty()) {
        throw new IllegalArgumentException("UPSERT 写入模式必须配置主键字段");
      }
      line(hocon, 1, "primary_keys = " + stringList(primaryKeys));
    }
    String customSql = text(sink.config, "sql", null);
    if (StringUtils.hasText(customSql)) {
      line(hocon, 1, "custom_sql = " + quote(customSql));
    }
    line(hocon, 1, "batch_size = " + batchSize);
    String dirtyPolicy = text(channelConfig, "dirtyDataPolicy", "stop");
    line(hocon, 1, "dirty_data_policy = " + ("skip".equalsIgnoreCase(dirtyPolicy) ? "SKIP" : "FAIL_FAST"));
    if ("skip".equalsIgnoreCase(dirtyPolicy)) {
      int dirtyLimit = Math.max(0, channelConfig.path("dirtyDataLimit").asInt(0));
      line(hocon, 1, "dirty_data_max_count = " + dirtyLimit);
    }
    hocon.append("}\n");

    return new BuildResult(
        hocon.toString(),
        sourceDataSource,
        sinkDataSource,
        sourceTableView,
        sinkTableView);
  }

  private void appendConnection(StringBuilder hocon, ConnectionDetails connection) {
    line(hocon, 1, "url = " + quote(connection.url));
    line(hocon, 1, "driver = " + quote(connection.driver));
    if (connection.username != null) {
      line(hocon, 1, "username = " + quote(connection.username));
    }
    if (connection.password != null) {
      line(hocon, 1, "password = " + quote(connection.password));
    }
    if (StringUtils.hasText(connection.schema)) {
      line(hocon, 1, "schema = " + quote(connection.schema));
    }
  }

  private Endpoint endpoint(JsonNode workflow, String kind) {
    JsonNode nodes = workflow.path("nodes");
    if (!nodes.isArray()) {
      throw new IllegalArgumentException("workflow.nodes 不能为空");
    }
    for (JsonNode node : nodes) {
      String nodeType = text(node.path("data"), "nodeType", text(node, "type", null));
      if (kind.equalsIgnoreCase(nodeType)) {
        JsonNode config = node.path("data").path("config");
        requireObject(config, kind + " 节点配置不能为空");
        return new Endpoint(config);
      }
    }
    throw new IllegalArgumentException("任务缺少 " + kind + " 节点");
  }

  private long resolveDataSourceId(
      JsonNode config,
      JsonNode basic,
      JsonNode workflow,
      boolean source) {
    long id = config.path("dataSourceId").asLong(0L);
    if (id <= 0L) {
      id = basic.path(source ? "sourceDataSourceId" : "targetDataSourceId").asLong(0L);
    }
    if (id <= 0L) {
      id = workflow.path(source ? "sourceDataSourceId" : "targetDataSourceId").asLong(0L);
    }
    if (id <= 0L) {
      throw new IllegalArgumentException(source ? "请选择来源数据源" : "请选择目标数据源");
    }
    return id;
  }

  private DataSourcePO dataSource(long id, String endpointName) {
    DataSourcePO dataSource = dataSourceDao.selectById(id);
    if (dataSource == null) {
      throw new IllegalArgumentException(endpointName + "数据源不存在：" + id);
    }
    return dataSource;
  }

  private ConnectionDetails connection(DataSourcePO dataSource) {
    JsonNode parameters = parseJson(dataSource.getConnectionParams());
    String url = firstText(parameters, "url", "jdbcUrl", "jdbc_url", "jdbc-url");
    if (!StringUtils.hasText(url)) {
      url = dataSource.getJdbcUrl();
    }
    if (!StringUtils.hasText(url)) {
      throw new IllegalArgumentException("数据源 " + dataSource.getName() + " 缺少 JDBC URL");
    }
    String driver = firstText(parameters, "driver", "driverClassName", "driver_class_name", "driver-class-name");
    if (!StringUtils.hasText(driver)) {
      driver = defaultDriver(url, dataSource.getDbType() == null ? null : dataSource.getDbType().name());
    }
    if (!StringUtils.hasText(driver)) {
      throw new IllegalArgumentException("数据源 " + dataSource.getName() + " 缺少 JDBC Driver");
    }
    String username = firstTextAllowEmpty(parameters, "username", "user");
    String password = firstTextAllowEmpty(parameters, "password", "passwd");
    String schema = firstText(parameters, "schema", "schemaName", "schema_name");
    return new ConnectionDetails(url.trim(), driver.trim(), username, password, schema);
  }

  private JsonNode parseJson(String value) {
    if (!StringUtils.hasText(value)) {
      return objectMapper.createObjectNode();
    }
    try {
      return objectMapper.readTree(value);
    } catch (JsonProcessingException exception) {
      throw new IllegalArgumentException("数据源连接参数不是有效 JSON", exception);
    }
  }

  private List<String> sourceTables(JsonNode config, String mode, String jobName) {
    if ("GUIDE_MULTI".equals(mode)) {
      List<String> tables = flattenTables(config.path("tables"));
      if (tables.isEmpty()) {
        String pattern = text(config, "tablePattern", null);
        if (StringUtils.hasText(pattern) && !containsWildcard(pattern)) {
          tables.add(pattern.trim());
        }
      }
      if (tables.isEmpty()) {
        throw new IllegalArgumentException("多表同步必须选择至少一张来源表，Link-Up 暂不直接执行通配符表名");
      }
      return tables;
    }

    String table = text(config, "table", null);
    String query = sourceQuery(config);
    if (!StringUtils.hasText(table) && StringUtils.hasText(query)) {
      table = "yak_query." + safeIdentifier(jobName);
    }
    if (!StringUtils.hasText(table)) {
      throw new IllegalArgumentException("请选择来源表");
    }
    return new ArrayList<>(List.of(table.trim()));
  }

  private String sourceQuery(JsonNode config) {
    if (!"sql".equalsIgnoreCase(text(config, "readMode", "table"))) {
      return null;
    }
    String query = text(config, "sql", null);
    if (!StringUtils.hasText(query)) {
      throw new IllegalArgumentException("SQL 读取模式必须填写来源查询 SQL");
    }
    return query.trim();
  }

  private String sinkTable(JsonNode config, String mode, List<String> sourceTables) {
    String explicit = text(config, "targetTableName", text(config, "table", null));
    if ("GUIDE_SINGLE".equals(mode)) {
      if (!StringUtils.hasText(explicit)) {
        throw new IllegalArgumentException("请选择或填写目标表");
      }
      return explicit.trim();
    }
    if (StringUtils.hasText(explicit)) {
      return explicit.trim();
    }
    String rule = text(config, "tableNamingRule", "same_name");
    String affix = text(config, "tableNameAffix", "");
    if ("prefix".equalsIgnoreCase(rule)) {
      return affix + "${table_name}";
    }
    if ("suffix".equalsIgnoreCase(rule)) {
      return "${table_name}" + affix;
    }
    if (!"same_name".equalsIgnoreCase(rule) && StringUtils.hasText(affix)) {
      return affix + "${table_name}";
    }
    return "${table_name}";
  }

  private String sinkTableView(String template, List<String> sourceTables, String mode) {
    if ("GUIDE_SINGLE".equals(mode)) {
      return template;
    }
    List<String> targetTables = new ArrayList<>();
    for (String sourceTable : sourceTables) {
      String schemaName = "";
      String tableName = sourceTable;
      int separator = sourceTable.lastIndexOf('.');
      if (separator >= 0) {
        schemaName = sourceTable.substring(0, separator);
        tableName = sourceTable.substring(separator + 1);
      }
      targetTables.add(
          template
              .replace("${schema_name}", schemaName)
              .replace("${table_name}", tableName));
    }
    return writeJson(targetTables);
  }

  private String tableView(List<String> tables, String mode) {
    return "GUIDE_MULTI".equals(mode) ? writeJson(tables) : tables.get(0);
  }

  private String writeJson(Object value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("序列化表信息失败", exception);
    }
  }

  private List<String> flattenTables(JsonNode value) {
    LinkedHashSet<String> result = new LinkedHashSet<>();
    flattenTables(value, null, result);
    return new ArrayList<>(result);
  }

  private void flattenTables(JsonNode value, String schema, Set<String> result) {
    if (value == null || value.isNull() || value.isMissingNode()) {
      return;
    }
    if (value.isTextual()) {
      String table = value.asText().trim();
      if (StringUtils.hasText(table)) {
        result.add(StringUtils.hasText(schema) && !table.contains(".") ? schema + "." + table : table);
      }
      return;
    }
    if (value.isArray()) {
      for (JsonNode item : value) {
        flattenTables(item, schema, result);
      }
      return;
    }
    if (value.isObject()) {
      value.fields().forEachRemaining(entry -> flattenTables(entry.getValue(), entry.getKey(), result));
    }
  }

  private String firstText(JsonNode node, String... keys) {
    String value = firstTextAllowEmpty(node, keys);
    return StringUtils.hasText(value) ? value.trim() : null;
  }

  private String firstTextAllowEmpty(JsonNode node, String... keys) {
    Set<String> normalizedKeys = new LinkedHashSet<>();
    Arrays.stream(keys).map(this::normalizeKey).forEach(normalizedKeys::add);
    return findText(node, normalizedKeys);
  }

  private String findText(JsonNode node, Set<String> normalizedKeys) {
    if (node == null || node.isNull() || node.isMissingNode()) {
      return null;
    }
    if (node.isObject()) {
      var fields = node.fields();
      while (fields.hasNext()) {
        var entry = fields.next();
        JsonNode value = entry.getValue();
        if (normalizedKeys.contains(normalizeKey(entry.getKey())) && value.isValueNode()) {
          return value.isNull() ? null : value.asText();
        }
      }
      fields = node.fields();
      while (fields.hasNext()) {
        String value = findText(fields.next().getValue(), normalizedKeys);
        if (value != null) {
          return value;
        }
      }
    } else if (node.isArray()) {
      for (JsonNode item : node) {
        String value = findText(item, normalizedKeys);
        if (value != null) {
          return value;
        }
      }
    }
    return null;
  }

  private String defaultDriver(String url, String dbType) {
    String normalized = (url + " " + (dbType == null ? "" : dbType)).toLowerCase(Locale.ROOT);
    if (normalized.contains("mariadb")) {
      return "org.mariadb.jdbc.Driver";
    }
    if (normalized.contains("mysql") || normalized.contains("doris")) {
      return "com.mysql.cj.jdbc.Driver";
    }
    if (normalized.contains("postgres")) {
      return "org.postgresql.Driver";
    }
    if (normalized.contains("oracle")) {
      return "oracle.jdbc.OracleDriver";
    }
    if (normalized.contains("kingbase")) {
      return "com.kingbase8.Driver";
    }
    if (normalized.contains("dm:") || normalized.contains("dameng")) {
      return "dm.jdbc.driver.DmDriver";
    }
    return null;
  }

  private List<String> splitValues(String value) {
    if (!StringUtils.hasText(value)) {
      return new ArrayList<>();
    }
    return Arrays.stream(value.split(","))
        .map(String::trim)
        .filter(StringUtils::hasText)
        .distinct()
        .toList();
  }

  private boolean containsWildcard(String value) {
    return value.contains("*") || value.contains("?") || value.contains("[");
  }

  private String tableList(List<String> tables) {
    StringBuilder builder = new StringBuilder("[");
    for (int index = 0; index < tables.size(); index++) {
      if (index > 0) {
        builder.append(", ");
      }
      builder.append("{ table_path = ").append(quote(tables.get(index))).append(" }");
    }
    return builder.append(']').toString();
  }

  private String stringList(List<String> values) {
    StringBuilder builder = new StringBuilder("[");
    for (int index = 0; index < values.size(); index++) {
      if (index > 0) {
        builder.append(", ");
      }
      builder.append(quote(values.get(index)));
    }
    return builder.append(']').toString();
  }

  private String safeIdentifier(String value) {
    String normalized = value.replaceAll("[^A-Za-z0-9_]", "_");
    return normalized.isBlank() ? "dataset" : normalized;
  }

  private String requiredText(JsonNode node, String field, String message) {
    String value = text(node, field, null);
    if (!StringUtils.hasText(value)) {
      throw new IllegalArgumentException(message);
    }
    return value.trim();
  }

  private String text(JsonNode node, String field, String fallback) {
    JsonNode value = node == null ? null : node.get(field);
    if (value == null || value.isNull() || !value.isValueNode()) {
      return fallback;
    }
    return value.asText(fallback);
  }

  private void requireObject(JsonNode node, String message) {
    if (node == null || !node.isObject()) {
      throw new IllegalArgumentException(message);
    }
  }

  private String normalizeKey(String value) {
    return value.replace("_", "").replace("-", "").toLowerCase(Locale.ROOT);
  }

  private String quote(String value) {
    String escaped = value
        .replace("\\", "\\\\")
        .replace("\"", "\\\"")
        .replace("\r", "\\r")
        .replace("\n", "\\n");
    return '"' + escaped + '"';
  }

  private void line(StringBuilder builder, String value) {
    builder.append(value).append('\n');
  }

  private void line(StringBuilder builder, int indent, String value) {
    builder.append("  ".repeat(Math.max(0, indent))).append(value).append('\n');
  }

  private static final class Endpoint {

    private final JsonNode config;

    private Endpoint(JsonNode config) {
      this.config = config;
    }
  }

  private static final class ConnectionDetails {

    private final String url;
    private final String driver;
    private final String username;
    private final String password;
    private final String schema;

    private ConnectionDetails(
        String url,
        String driver,
        String username,
        String password,
        String schema) {
      this.url = url;
      this.driver = driver;
      this.username = username;
      this.password = password;
      this.schema = schema;
    }
  }

  @Getter
  public static final class BuildResult {

    private final String hocon;
    private final DataSourcePO sourceDataSource;
    private final DataSourcePO sinkDataSource;
    private final String sourceTable;
    private final String sinkTable;

    BuildResult(
        String hocon,
        DataSourcePO sourceDataSource,
        DataSourcePO sinkDataSource,
        String sourceTable,
        String sinkTable) {
      this.hocon = hocon;
      this.sourceDataSource = sourceDataSource;
      this.sinkDataSource = sinkDataSource;
      this.sourceTable = sourceTable;
      this.sinkTable = sinkTable;
    }
  }
}
