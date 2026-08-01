package io.yak.ops.business.sync.offline.engine;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.yak.ops.business.datasource.dao.DataSourceDao;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.common.bean.po.datasource.DataSourcePO;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/** Converts the Yak Ops task editor model into Link-Up's structured JobSpec protocol. */
@ConditionalOnOfflineSyncEnabled
@Component
public class LinkUpJobSpecFactory {

  private static final String API_VERSION = "link-up/v1";
  private static final String KIND = "BatchSyncJob";
  private static final Set<String> DATASOURCE_OWNED_OPTIONS = Set.of(
      "url",
      "driver",
      "username",
      "password",
      "schema",
      "dialect",
      "compatible_mode",
      "properties",
      "connection_check_timeout_sec",
      "connect_timeout_ms",
      "socket_timeout_ms");

  private final DataSourceDao dataSourceDao;
  private final ObjectMapper objectMapper;

  public LinkUpJobSpecFactory(
      DataSourceDao dataSourceDao,
      @Qualifier("offlineSyncJsonMapper") ObjectMapper objectMapper) {
    this.dataSourceDao = dataSourceDao;
    this.objectMapper = objectMapper;
  }

  /** Builds a logical, durable JobSpec. JDBC credentials are intentionally not included. */
  public BuildResult build(JsonNode definition) {
    requireObject(definition, "任务定义不能为空");
    JsonNode basic = definition.path("basic");
    JsonNode workflow = definition.path("workflow");
    requireObject(basic, "basic 配置不能为空");
    requireObject(workflow, "workflow 配置不能为空");

    String jobName = requiredText(basic, "jobName", "任务名称不能为空");
    String mode = text(basic, "mode", text(definition, "mode", "GUIDE_SINGLE"));
    if (!"GUIDE_SINGLE".equals(mode) && !"GUIDE_MULTI".equals(mode)) {
      throw new IllegalArgumentException("离线同步仅支持 GUIDE_SINGLE 和 GUIDE_MULTI 模式");
    }

    Endpoint source = endpoint(workflow, "source");
    Endpoint sink = endpoint(workflow, "sink");
    String sourceConnectorId = connectorId(source.config, "jdbc");
    String sinkConnectorId = connectorId(sink.config, "jdbc");
    boolean jdbcSource = ConnectorIdResolver.isJdbc(sourceConnectorId);
    boolean jdbcSink = ConnectorIdResolver.isJdbc(sinkConnectorId);

    Long sourceDataSourceId = resolveDataSourceId(
        source.config, basic, workflow, true, jdbcSource);
    Long sinkDataSourceId = resolveDataSourceId(
        sink.config, basic, workflow, false, jdbcSink);
    DataSourcePO sourceDataSource = dataSource(sourceDataSourceId, "来源端");
    DataSourcePO sinkDataSource = dataSource(sinkDataSourceId, "目标端");

    ObjectNode sourceOptions = connectorOptions(source.config);
    ObjectNode sinkOptions = connectorOptions(sink.config);
    if (jdbcSource) {
      removeDatasourceOwnedOptions(sourceOptions);
    }
    if (jdbcSink) {
      removeDatasourceOwnedOptions(sinkOptions);
    }

    String sourceTableView = text(sourceOptions, "table_path", null);
    String sinkTableView = text(sinkOptions, "table_path", null);
    int parallelism = Math.max(1, definition.path("env").path("parallelism").asInt(1));
    int channelCapacity = Math.max(1, definition.path("env").path("channelCapacity").asInt(64));
    int batchSize = Math.max(1, sink.config.path("batchSize").asInt(1000));
    int fetchSize = Math.max(1, source.config.path("fetchSize").asInt(batchSize));

    List<String> sourceTables = new ArrayList<>();
    if (jdbcSource) {
      sourceTables = sourceTables(source.config, mode, jobName);
      String sourceQuery = sourceQuery(source.config);
      sourceOptions.put("fetch_size", fetchSize);
      if ("GUIDE_MULTI".equals(mode)) {
        ArrayNode tableList = objectMapper.createArrayNode();
        for (String table : sourceTables) {
          tableList.addObject().put("table_path", table);
        }
        sourceOptions.set("table_list", tableList);
        sourceOptions.remove("table_path");
      } else {
        sourceOptions.put("table_path", sourceTables.get(0));
        sourceOptions.remove("table_list");
        if (StringUtils.hasText(sourceQuery)) {
          sourceOptions.put("query", sourceQuery);
        } else {
          sourceOptions.remove("query");
        }
      }
      String whereCondition = text(source.config, "whereCondition", null);
      if (StringUtils.hasText(whereCondition)) {
        sourceOptions.put("where_condition", whereCondition.trim());
      }
      sourceTableView = tableView(sourceTables, mode);
    }

    if (jdbcSink) {
      String sinkTableTemplate;
      if (jdbcSource) {
        sinkTableTemplate = sinkTable(sink.config, mode, sourceTables);
        sinkTableView = sinkTableView(sinkTableTemplate, sourceTables, mode);
      } else {
        sinkTableTemplate = text(
            sink.config,
            "targetTableName",
            text(sink.config, "table", text(sinkOptions, "table_path", null)));
        if (!StringUtils.hasText(sinkTableTemplate)) {
          throw new IllegalArgumentException("请选择或填写目标表");
        }
        sinkTableTemplate = sinkTableTemplate.trim();
        sinkTableView = sinkTableTemplate;
      }
      sinkOptions.put("table_path", sinkTableTemplate);
      sinkOptions.put(
          "schema_save_mode",
          sink.config.path("autoCreateTable").asBoolean(false)
              ? "CREATE_SCHEMA_WHEN_NOT_EXIST"
              : "ERROR_WHEN_SCHEMA_NOT_EXIST");
      String writeMode = text(sink.config, "writeMode", "append").toLowerCase(Locale.ROOT);
      sinkOptions.put(
          "data_save_mode",
          "overwrite".equals(writeMode) ? "DROP_DATA" : "APPEND_DATA");
      sinkOptions.put("write_mode", "upsert".equals(writeMode) ? "UPSERT" : "INSERT");
      if ("upsert".equals(writeMode)) {
        List<String> primaryKeys = splitValues(text(sink.config, "primaryKey", null));
        if (primaryKeys.isEmpty()) {
          throw new IllegalArgumentException("UPSERT 写入模式必须配置主键字段");
        }
        sinkOptions.set("primary_keys", objectMapper.valueToTree(primaryKeys));
      } else {
        sinkOptions.remove("primary_keys");
      }
      String customSql = text(sink.config, "sql", null);
      if (StringUtils.hasText(customSql)) {
        sinkOptions.put("custom_sql", customSql.trim());
      }
      sinkOptions.put("batch_size", batchSize);
      JsonNode channelConfig = workflow.path("channelConfig");
      String dirtyPolicy = text(channelConfig, "dirtyDataPolicy", "stop");
      sinkOptions.put(
          "dirty_data_policy",
          "skip".equalsIgnoreCase(dirtyPolicy) ? "SKIP" : "FAIL_FAST");
      if ("skip".equalsIgnoreCase(dirtyPolicy)) {
        sinkOptions.put(
            "dirty_data_max_count",
            Math.max(0, channelConfig.path("dirtyDataLimit").asInt(0)));
      } else {
        sinkOptions.remove("dirty_data_max_count");
      }
    }

    ObjectNode runtime = objectMapper.createObjectNode();
    runtime.put("batchSize", fetchSize);
    runtime.put("sourceParallelism", parallelism);
    runtime.put("sinkParallelism", parallelism);
    runtime.put("pipelineParallelism", "GUIDE_MULTI".equals(mode) ? parallelism : 1);
    runtime.put("maxBufferedBatches", channelCapacity);
    copyRuntime(definition.path("env"), runtime);

    ObjectNode jobSpec = objectMapper.createObjectNode();
    jobSpec.put("apiVersion", API_VERSION);
    jobSpec.put("kind", KIND);
    jobSpec.put("name", jobName.trim());
    jobSpec.set(
        "source",
        connector(sourceConnectorId, sourceOptions, sourceDataSourceId));
    jobSpec.set(
        "sink",
        connector(sinkConnectorId, sinkOptions, sinkDataSourceId));
    jobSpec.set("runtime", runtime);

    JsonNode canonical = canonical(jobSpec);
    return new BuildResult(
        canonical,
        write(canonical),
        sourceDataSource,
        sinkDataSource,
        sourceConnectorId,
        sinkConnectorId,
        sourceTableView,
        sinkTableView);
  }

  /** Resolves datasource references immediately before a Worker submission. */
  public JsonNode resolveForExecution(JsonNode logicalJobSpec) {
    requireObject(logicalJobSpec, "JobSpec 不能为空");
    ObjectNode resolved = (ObjectNode) logicalJobSpec.deepCopy();
    resolveEndpointForExecution(resolved, "source", "来源端");
    resolveEndpointForExecution(resolved, "sink", "目标端");
    return canonical(resolved);
  }

  public String resolveForExecution(String logicalJobSpecJson) {
    if (!StringUtils.hasText(logicalJobSpecJson)) {
      throw new IllegalArgumentException("JobSpec 不能为空");
    }
    try {
      return write(resolveForExecution(objectMapper.readTree(logicalJobSpecJson)));
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("JobSpec JSON 已损坏", exception);
    }
  }

  private void resolveEndpointForExecution(
      ObjectNode root,
      String endpointName,
      String endpointLabel) {
    JsonNode value = root.get(endpointName);
    requireObject(value, endpointLabel + " JobSpec 不完整");
    ObjectNode endpoint = (ObjectNode) value;
    String connectorId = ConnectorIdResolver.resolve(
        text(endpoint, "connectorId", null), null, null, null);
    endpoint.put("connectorId", connectorId);
    if (ConnectorIdResolver.isJdbc(connectorId)) {
      long dataSourceId = endpoint.path("dataSourceRef").path("id").asLong(0L);
      if (dataSourceId <= 0L) {
        throw new IllegalStateException(endpointLabel + " JDBC JobSpec 缺少 dataSourceRef.id");
      }
      ObjectNode options = endpoint.with("options");
      removeDatasourceOwnedOptions(options);
      appendConnection(options, connection(dataSource(dataSourceId, endpointLabel)));
    }
    endpoint.remove("dataSourceRef");
  }

  private ObjectNode connector(
      String connectorId,
      ObjectNode options,
      Long dataSourceId) {
    ObjectNode connector = objectMapper.createObjectNode();
    connector.put("connectorId", connectorId);
    if (dataSourceId != null) {
      connector.putObject("dataSourceRef").put("id", dataSourceId);
    }
    connector.set("options", options);
    return connector;
  }

  private String connectorId(JsonNode config, String fallback) {
    return ConnectorIdResolver.resolve(
        text(config, "connectorId", null),
        text(config, "connectorType", null),
        text(config, "dbType", null),
        fallback);
  }

  private ObjectNode connectorOptions(JsonNode config) {
    JsonNode value = config == null ? null : config.get("connectorOptions");
    return value != null && value.isObject()
        ? (ObjectNode) value.deepCopy()
        : objectMapper.createObjectNode();
  }

  private void removeDatasourceOwnedOptions(ObjectNode options) {
    DATASOURCE_OWNED_OPTIONS.forEach(options::remove);
  }

  private void copyRuntime(JsonNode env, ObjectNode runtime) {
    copyPositiveLong(env, runtime, "maxBufferedRecords", "maxBufferedRecords");
    copyPositiveLong(env, runtime, "maxBufferedBytes", "maxBufferedBytes");
    copyPositiveLong(env, runtime, "maxRecordsPerSecond", "maxRecordsPerSecond");
    copyPositiveLong(env, runtime, "maxBytesPerSecond", "maxBytesPerSecond");
    copyText(env, runtime, "sinkPartitionStrategy", "sinkPartitionStrategy");
    copyText(env, runtime, "splitAssignmentMode", "splitAssignmentMode");
  }

  private void copyPositiveLong(
      JsonNode source,
      ObjectNode target,
      String sourceKey,
      String targetKey) {
    JsonNode value = source == null ? null : source.get(sourceKey);
    if (value != null && value.isNumber() && value.asLong() > 0L) {
      target.put(targetKey, value.asLong());
    }
  }

  private void copyText(
      JsonNode source,
      ObjectNode target,
      String sourceKey,
      String targetKey) {
    String value = text(source, sourceKey, null);
    if (StringUtils.hasText(value)) {
      target.put(targetKey, value.trim());
    }
  }

  private void appendConnection(ObjectNode options, ConnectionDetails connection) {
    options.put("url", connection.url);
    options.put("driver", connection.driver);
    if (connection.username != null) {
      options.put("username", connection.username);
    }
    if (connection.password != null) {
      options.put("password", connection.password);
    }
    if (StringUtils.hasText(connection.schema)) {
      options.put("schema", connection.schema);
    }
  }

  private JsonNode canonical(JsonNode node) {
    if (node == null || node.isNull() || node.isValueNode()) {
      return node;
    }
    if (node.isArray()) {
      ArrayNode result = objectMapper.createArrayNode();
      for (JsonNode item : node) {
        result.add(canonical(item));
      }
      return result;
    }
    ObjectNode result = objectMapper.createObjectNode();
    Map<String, JsonNode> fields = new TreeMap<>();
    Iterator<Map.Entry<String, JsonNode>> iterator = node.fields();
    while (iterator.hasNext()) {
      Map.Entry<String, JsonNode> entry = iterator.next();
      fields.put(entry.getKey(), canonical(entry.getValue()));
    }
    fields.forEach(result::set);
    return result;
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

  private Long resolveDataSourceId(
      JsonNode config,
      JsonNode basic,
      JsonNode workflow,
      boolean source,
      boolean required) {
    long id = config.path("dataSourceId").asLong(0L);
    if (id <= 0L) {
      id = basic.path(source ? "sourceDataSourceId" : "targetDataSourceId").asLong(0L);
    }
    if (id <= 0L) {
      id = workflow.path(source ? "sourceDataSourceId" : "targetDataSourceId").asLong(0L);
    }
    if (id <= 0L && required) {
      throw new IllegalArgumentException(source ? "请选择来源数据源" : "请选择目标数据源");
    }
    return id <= 0L ? null : id;
  }

  private DataSourcePO dataSource(Long id, String endpointName) {
    if (id == null) {
      return null;
    }
    DataSourcePO dataSource = dataSourceDao.selectById(id);
    if (dataSource == null) {
      throw new IllegalArgumentException(endpointName + "数据源不存在：" + id);
    }
    return dataSource;
  }

  private ConnectionDetails connection(DataSourcePO dataSource) {
    if (dataSource == null) {
      throw new IllegalArgumentException("JDBC Connector 必须选择数据源");
    }
    JsonNode parameters = parseJson(dataSource.getConnectionParams());
    String url = firstText(parameters, "url", "jdbcUrl", "jdbc_url", "jdbc-url");
    if (!StringUtils.hasText(url)) {
      url = dataSource.getJdbcUrl();
    }
    if (!StringUtils.hasText(url)) {
      throw new IllegalArgumentException("数据源 " + dataSource.getName() + " 缺少 JDBC URL");
    }
    String driver = firstText(
        parameters,
        "driver",
        "driverClassName",
        "driver_class_name",
        "driver-class-name");
    if (!StringUtils.hasText(driver)) {
      driver = defaultDriver(
          url,
          dataSource.getDbType() == null ? null : dataSource.getDbType().name());
    }
    if (!StringUtils.hasText(driver)) {
      throw new IllegalArgumentException("数据源 " + dataSource.getName() + " 缺少 JDBC Driver");
    }
    return new ConnectionDetails(
        url.trim(),
        driver.trim(),
        firstTextAllowEmpty(parameters, "username", "user"),
        firstTextAllowEmpty(parameters, "password", "passwd"),
        firstText(parameters, "schema", "schemaName", "schema_name"));
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
        throw new IllegalArgumentException(
            "多表同步必须选择至少一张来源表，Link-Up 暂不直接执行通配符表名");
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

  private String sinkTableView(
      String template,
      List<String> sourceTables,
      String mode) {
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

  private String write(JsonNode value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("序列化 JobSpec 失败", exception);
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
        result.add(
            StringUtils.hasText(schema) && !table.contains(".")
                ? schema + "." + table
                : table);
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
      value.fields().forEachRemaining(
          entry -> flattenTables(entry.getValue(), entry.getKey(), result));
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
      Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
      while (fields.hasNext()) {
        Map.Entry<String, JsonNode> entry = fields.next();
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

  public static final class BuildResult {
    private final JsonNode jobSpec;
    private final String jobSpecJson;
    private final DataSourcePO sourceDataSource;
    private final DataSourcePO sinkDataSource;
    private final String sourceConnectorId;
    private final String sinkConnectorId;
    private final String sourceTable;
    private final String sinkTable;

    BuildResult(
        JsonNode jobSpec,
        String jobSpecJson,
        DataSourcePO sourceDataSource,
        DataSourcePO sinkDataSource,
        String sourceConnectorId,
        String sinkConnectorId,
        String sourceTable,
        String sinkTable) {
      this.jobSpec = jobSpec;
      this.jobSpecJson = jobSpecJson;
      this.sourceDataSource = sourceDataSource;
      this.sinkDataSource = sinkDataSource;
      this.sourceConnectorId = sourceConnectorId;
      this.sinkConnectorId = sinkConnectorId;
      this.sourceTable = sourceTable;
      this.sinkTable = sinkTable;
    }

    public JsonNode getJobSpec() {
      return jobSpec;
    }

    public String getJobSpecJson() {
      return jobSpecJson;
    }

    public DataSourcePO getSourceDataSource() {
      return sourceDataSource;
    }

    public DataSourcePO getSinkDataSource() {
      return sinkDataSource;
    }

    public String getSourceConnectorId() {
      return sourceConnectorId;
    }

    public String getSinkConnectorId() {
      return sinkConnectorId;
    }

    public String getSourceTable() {
      return sourceTable;
    }

    public String getSinkTable() {
      return sinkTable;
    }
  }
}
