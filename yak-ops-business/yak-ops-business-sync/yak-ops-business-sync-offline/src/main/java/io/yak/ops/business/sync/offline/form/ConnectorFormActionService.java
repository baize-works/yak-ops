package io.yak.ops.business.sync.offline.form;

import io.yak.ops.business.datasource.service.DataSourceCatalogService;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.common.bean.vo.datasource.DataSourceCatalogColumnOptionVO;
import io.yak.ops.common.bean.vo.datasource.DataSourceCatalogOptionVO;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** 为动态表单提供 Schema 声明过的只读表和字段发现 Action。 */
@ConditionalOnOfflineSyncEnabled
@Service
public class ConnectorFormActionService {

  private static final Set<String> SAFE_ACTIONS = Set.of("LIST_TABLES", "LIST_COLUMNS");

  private final ObjectProvider<DataSourceCatalogService> catalogServiceProvider;
  private final ConnectorFormSchemaService schemaService;

  public ConnectorFormActionService(
      ObjectProvider<DataSourceCatalogService> catalogServiceProvider,
      ConnectorFormSchemaService schemaService) {
    this.catalogServiceProvider = catalogServiceProvider;
    this.schemaService = schemaService;
  }

  public ActionResult execute(String action, ActionRequest request) {
    String normalized = normalize(action);
    if (!SAFE_ACTIONS.contains(normalized)) {
      throw new IllegalArgumentException("动态表单仅允许只读元数据 Action：" + action);
    }
    validateSchemaContract(normalized, request);

    DataSourceCatalogService catalogService = catalogServiceProvider.getIfAvailable();
    if (catalogService == null) {
      throw new IllegalStateException("数据源 Catalog 服务未启用");
    }
    Long dataSourceId = requireDataSourceId(request);
    Map<String, Object> values = allowedRequestValues(request);

    return switch (normalized) {
      case "LIST_TABLES" -> filterOptions(
          tableOptions(catalogService.listTableReference(
              dataSourceId, request.getMatchMode(), request.getKeyword())),
          request.getKeyword());
      case "LIST_COLUMNS" -> filterOptions(
          columnOptions(catalogService.listColumn(dataSourceId, values)),
          request.getKeyword());
      default -> throw new IllegalArgumentException("不支持的 Connector Form Action：" + action);
    };
  }

  private void validateSchemaContract(String action, ActionRequest request) {
    if (request == null
        || !StringUtils.hasText(request.getConnectorId())
        || !StringUtils.hasText(request.getRole())
        || !StringUtils.hasText(request.getFieldKey())) {
      throw new IllegalArgumentException("connectorId、role 和 fieldKey 不能为空");
    }
    ConnectorFormSchema schema = schemaService.get(
        request.getConnectorId().trim(),
        request.getRole().trim());
    ConnectorFormSchema.Field field = schema.getFields().stream()
        .filter(item -> request.getFieldKey().trim().equals(item.getKey()))
        .findFirst()
        .orElseThrow(() -> new IllegalArgumentException(
            "Form Schema 中不存在字段：" + request.getFieldKey()));
    ConnectorFormSchema.OptionSource optionSource = field.getOptionSource();
    if (optionSource == null || !action.equals(normalize(optionSource.getAction()))) {
      throw new IllegalArgumentException(
          "字段 " + field.getKey() + " 未声明 Action " + action);
    }
  }

  private Map<String, Object> allowedRequestValues(ActionRequest request) {
    ConnectorFormSchema schema = schemaService.get(
        request.getConnectorId().trim(),
        request.getRole().trim());
    ConnectorFormSchema.Field field = schema.getFields().stream()
        .filter(item -> request.getFieldKey().trim().equals(item.getKey()))
        .findFirst()
        .orElseThrow();
    List<String> allowed = field.getOptionSource() == null
        ? List.of()
        : field.getOptionSource().getRequestValueKeys();
    Map<String, Object> source = request.getValues() == null
        ? Map.of()
        : request.getValues();
    if (allowed == null || allowed.isEmpty()) {
      return new LinkedHashMap<>(source);
    }
    Map<String, Object> result = new LinkedHashMap<>();
    for (String key : allowed) {
      if (source.containsKey(key)) {
        result.put(key, source.get(key));
      }
    }
    return result;
  }

  private ActionResult filterOptions(ActionResult result, String keyword) {
    if (!StringUtils.hasText(keyword)) {
      return result;
    }
    String normalized = keyword.trim().toLowerCase(Locale.ROOT);
    List<Option> filtered = result.getOptions().stream()
        .filter(option -> String.valueOf(option.getValue()).toLowerCase(Locale.ROOT).contains(normalized)
            || String.valueOf(option.getLabel()).toLowerCase(Locale.ROOT).contains(normalized)
            || String.valueOf(option.getDescription()).toLowerCase(Locale.ROOT).contains(normalized))
        .toList();
    return ActionResult.options(filtered);
  }

  private ActionResult tableOptions(List<DataSourceCatalogOptionVO> source) {
    List<Option> options = new ArrayList<>();
    for (DataSourceCatalogOptionVO item : source) {
      Option option = new Option();
      option.setValue(item.getValue());
      option.setLabel(item.getLabel() == null || item.getLabel().isBlank()
          ? String.valueOf(item.getValue()) : item.getLabel());
      option.setDescription(item.getDescription());
      options.add(option);
    }
    return ActionResult.options(options);
  }

  private ActionResult columnOptions(List<DataSourceCatalogColumnOptionVO> source) {
    List<Option> options = new ArrayList<>();
    for (DataSourceCatalogColumnOptionVO item : source) {
      Option option = new Option();
      option.setValue(item.getFieldName());
      option.setLabel(String.valueOf(item.getFieldName()));
      String type = item.getFieldType() == null ? "" : String.valueOf(item.getFieldType());
      String comment = item.getFieldComment() == null ? "" : item.getFieldComment();
      option.setDescription(comment.isBlank() ? type : type + " · " + comment);
      Map<String, Object> meta = new LinkedHashMap<>();
      meta.put("type", item.getFieldType());
      meta.put("nullable", item.getIsNullable());
      meta.put("primaryKey", "PRI".equalsIgnoreCase(item.getFieldKey()));
      meta.put("ordinalPosition", item.getOrdinalPosition());
      option.setMeta(meta);
      options.add(option);
    }
    return ActionResult.options(options);
  }

  private Long requireDataSourceId(ActionRequest request) {
    if (request == null || request.getDataSourceId() == null || request.getDataSourceId() <= 0L) {
      throw new IllegalArgumentException("dataSourceId 不能为空");
    }
    return request.getDataSourceId();
  }

  private String normalize(String value) {
    return value == null ? "" : value.trim().toUpperCase(Locale.ROOT).replace('-', '_');
  }

  public static class ActionRequest {
    private Long dataSourceId;
    private String connectorId;
    private String role;
    private String fieldKey;
    private String keyword;
    private String matchMode;
    private Map<String, Object> values = new LinkedHashMap<>();

    public Long getDataSourceId() { return dataSourceId; }
    public void setDataSourceId(Long dataSourceId) { this.dataSourceId = dataSourceId; }
    public String getConnectorId() { return connectorId; }
    public void setConnectorId(String connectorId) { this.connectorId = connectorId; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getFieldKey() { return fieldKey; }
    public void setFieldKey(String fieldKey) { this.fieldKey = fieldKey; }
    public String getKeyword() { return keyword; }
    public void setKeyword(String keyword) { this.keyword = keyword; }
    public String getMatchMode() { return matchMode; }
    public void setMatchMode(String matchMode) { this.matchMode = matchMode; }
    public Map<String, Object> getValues() { return values; }
    public void setValues(Map<String, Object> values) { this.values = values; }
  }

  public static class ActionResult {
    private List<Option> options = new ArrayList<>();
    private Object data;

    public static ActionResult options(List<Option> options) {
      ActionResult result = new ActionResult();
      result.setOptions(options);
      return result;
    }

    public static ActionResult data(Object data) {
      ActionResult result = new ActionResult();
      result.setData(data);
      return result;
    }

    public List<Option> getOptions() { return options; }
    public void setOptions(List<Option> options) { this.options = options; }
    public Object getData() { return data; }
    public void setData(Object data) { this.data = data; }
  }

  public static class Option {
    private Object value;
    private String label;
    private String description;
    private Map<String, Object> meta = new LinkedHashMap<>();

    public Object getValue() { return value; }
    public void setValue(Object value) { this.value = value; }
    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Map<String, Object> getMeta() { return meta; }
    public void setMeta(Map<String, Object> meta) { this.meta = meta; }
  }
}
