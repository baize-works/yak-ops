package io.yak.ops.business.sync.offline.form;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * 内置 Presentation Profile；未知 Connector 自动回退到通用推导。
 *
 * @author weifuwan
 */
@ConditionalOnOfflineSyncEnabled
@Component
public class ConnectorPresentationRegistry {

  private static final long CATALOG_CACHE_TTL_MILLIS = 30_000L;
  private final Map<String, ConnectorPresentationProfile> profiles;

  public ConnectorPresentationRegistry() {
    Map<String, ConnectorPresentationProfile> values = new LinkedHashMap<>();
    register(values, jdbcSource());
    register(values, jdbcSink());
    this.profiles = Collections.unmodifiableMap(values);
  }

  public ConnectorPresentationProfile find(String connectorId, String role) {
    return profiles.get(key(connectorId, role));
  }

  private void register(Map<String, ConnectorPresentationProfile> values,
      ConnectorPresentationProfile profile) {
    values.put(key(profile.getConnectorId(), profile.getRole()), profile);
  }

  private String key(String connectorId, String role) {
    return connectorId.trim().toLowerCase(Locale.ROOT) + ":" + role.trim().toUpperCase(Locale.ROOT);
  }

  private ConnectorPresentationProfile jdbcSource() {
    Map<String, ConnectorPresentationProfile.FieldProfile> fields = new LinkedHashMap<>();
    datasourceFields(fields);
    fields.put("table_path", remoteField("来源表", "read", 10, "PRIMARY", "table-picker",
        "LIST_TABLES", true, false));
    fields.put("table_list", remoteField("多表配置", "read", 20, "PRIMARY", "multi-table-picker",
        "LIST_TABLES", true, true));
    fields.put("query", ConnectorPresentationProfile.FieldProfile.builder()
        .label("查询 SQL").group("read").order(30).importance("PRIMARY")
        .widget("sql-editor").clearWhenHidden(true).build());
    fields.put("where_condition", field("过滤条件", "read", 40, "COMMON", "sql-condition"));
    fields.put("read_consistency", field("读取一致性", "consistency", 10, "COMMON", "select"));
    fields.put("fetch_size", field("每批读取行数", "performance", 10, "ADVANCED", "number"));
    fields.put("partition_column", ConnectorPresentationProfile.FieldProfile.builder()
        .label("分片字段").group("performance").order(20).importance("ADVANCED")
        .widget("field-selector").dependsOn("table_path", "query")
        .optionSource("LIST_COLUMNS", true, false, CATALOG_CACHE_TTL_MILLIS,
            "table_path", "query")
        .clearWhenHidden(true).build());
    fields.put("partition_num", field("分片数量", "performance", 30, "ADVANCED", "number"));
    fields.put("partition_lower_bound", field("分片下界", "performance", 40, "EXPERT", "text"));
    fields.put("partition_upper_bound", field("分片上界", "performance", 50, "EXPERT", "text"));
    fields.put("split_planning_mode", field("分片规划方式", "performance", 60, "ADVANCED", "select"));
    fields.put("statistics_query_timeout", field("统计查询超时", "advanced", 10, "EXPERT", "number"));
    fields.put("sample_size", field("统计采样数量", "advanced", 20, "EXPERT", "number"));
    fields.put("allow_statistics_fallback", field("允许统计降级", "advanced", 30, "EXPERT", "switch"));
    fields.put("null_partition_single_split", field("空分片单独处理", "advanced", 40, "EXPERT", "switch"));
    fields.put("multi_table_failure_policy", field("多表失败策略", "advanced", 50, "ADVANCED", "select"));
    fields.put("int_type_narrowing", field("整数类型缩小", "advanced", 60, "EXPERT", "switch"));
    return new ConnectorPresentationProfile("jdbc", "SOURCE", "2",
        Arrays.asList(
            group("read", "读取配置", 10, false, false),
            group("consistency", "一致性", 20, false, false),
            group("performance", "性能配置", 30, true, false),
            group("advanced", "高级配置", 40, true, false),
            group("datasource", "数据源注入", 90, true, true)), fields);
  }

  private ConnectorPresentationProfile jdbcSink() {
    Map<String, ConnectorPresentationProfile.FieldProfile> fields = new LinkedHashMap<>();
    datasourceFields(fields);
    fields.put("table_path", remoteField("目标表", "write", 10, "PRIMARY", "table-picker",
        "LIST_TABLES", true, false));
    fields.put("schema_save_mode", field("表结构处理", "write", 20, "PRIMARY", "select"));
    fields.put("data_save_mode", field("已有数据处理", "write", 30, "PRIMARY", "select"));
    fields.put("write_mode", field("写入方式", "write", 40, "PRIMARY", "segmented"));
    fields.put("primary_keys", ConnectorPresentationProfile.FieldProfile.builder()
        .label("主键字段").group("write").order(50).importance("COMMON")
        .widget("field-selector").dependsOn("table_path")
        .optionSource("LIST_COLUMNS", true, true, CATALOG_CACHE_TTL_MILLIS, "table_path")
        .clearWhenHidden(true).build());
    fields.put("custom_sql", ConnectorPresentationProfile.FieldProfile.builder()
        .label("自定义写入 SQL").group("write").order(60).importance("ADVANCED")
        .widget("sql-editor").clearWhenHidden(true).build());
    fields.put("batch_size", field("每批写入行数", "performance", 10, "ADVANCED", "number"));
    fields.put("prepared_statement_cache_size", field("语句缓存数量", "performance", 20, "EXPERT", "number"));
    fields.put("query_timeout_sec", field("写入超时", "performance", 30, "ADVANCED", "number"));
    fields.put("max_retries", field("批次重试次数", "performance", 40, "ADVANCED", "number"));
    fields.put("dirty_data_policy", field("脏数据策略", "dirty", 10, "COMMON", "select"));
    fields.put("dirty_data_output_type", field("脏数据输出", "dirty", 20, "ADVANCED", "select"));
    fields.put("dirty_data_output_path", field("脏数据文件路径", "dirty", 30, "ADVANCED", "file-path"));
    fields.put("dirty_data_max_samples", field("样例保留上限", "dirty", 40, "EXPERT", "number"));
    fields.put("dirty_data_max_count", field("脏数据数量上限", "dirty", 50, "ADVANCED", "number"));
    fields.put("dirty_data_max_percentage", field("脏数据比例上限", "dirty", 60, "ADVANCED", "number"));
    fields.put("create_primary_key", field("自动创建主键", "advanced", 10, "ADVANCED", "switch"));
    return new ConnectorPresentationProfile("jdbc", "SINK", "2",
        Arrays.asList(
            group("write", "写入配置", 10, false, false),
            group("performance", "性能配置", 20, true, false),
            group("dirty", "脏数据处理", 30, true, false),
            group("advanced", "高级配置", 40, true, false),
            group("datasource", "数据源注入", 90, true, true)), fields);
  }

  private void datasourceFields(Map<String, ConnectorPresentationProfile.FieldProfile> fields) {
    for (String key : Arrays.asList("url", "driver", "username", "password", "dialect",
        "compatible_mode", "schema", "properties", "connection_check_timeout_sec",
        "connect_timeout_ms", "socket_timeout_ms")) {
      fields.put(key, ConnectorPresentationProfile.FieldProfile.builder()
          .group("datasource").importance("HIDDEN").widget("hidden")
          .hidden(true).readOnly(true).valueSource("DATASOURCE").build());
    }
  }

  private ConnectorPresentationProfile.GroupProfile group(String id, String title, int order,
      boolean collapsed, boolean hidden) {
    return new ConnectorPresentationProfile.GroupProfile(id, title, order, collapsed, hidden);
  }

  private ConnectorPresentationProfile.FieldProfile field(String label, String groupId, int order,
      String importance, String widget) {
    return ConnectorPresentationProfile.FieldProfile.builder()
        .label(label).group(groupId).order(order).importance(importance).widget(widget).build();
  }

  private ConnectorPresentationProfile.FieldProfile remoteField(String label, String groupId,
      int order, String importance, String widget, String action, boolean searchable,
      boolean multiple) {
    return ConnectorPresentationProfile.FieldProfile.builder()
        .label(label).group(groupId).order(order).importance(importance).widget(widget)
        .optionSource(action, searchable, multiple, CATALOG_CACHE_TTL_MILLIS)
        .build();
  }
}
