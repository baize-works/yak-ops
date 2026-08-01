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
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

/** 为动态表单提供表、字段、预览和 SQL 等受控 Action。 */
@ConditionalOnOfflineSyncEnabled
@Service
public class ConnectorFormActionService {

  private final ObjectProvider<DataSourceCatalogService> catalogServiceProvider;

  public ConnectorFormActionService(
      ObjectProvider<DataSourceCatalogService> catalogServiceProvider) {
    this.catalogServiceProvider = catalogServiceProvider;
  }

  public ActionResult execute(String action, ActionRequest request) {
    String normalized = action == null ? "" : action.trim().toUpperCase(Locale.ROOT);
    DataSourceCatalogService catalogService = catalogServiceProvider.getIfAvailable();
    if (catalogService == null) {
      throw new IllegalStateException("数据源 Catalog 服务未启用");
    }
    Long dataSourceId = requireDataSourceId(request);
    Map<String, Object> values = request == null || request.getValues() == null
        ? new LinkedHashMap<>() : new LinkedHashMap<>(request.getValues());

    return switch (normalized) {
      case "LIST_TABLES" -> filterOptions(
          tableOptions(catalogService.listTableReference(
              dataSourceId, request.getMatchMode(), request.getKeyword())),
          request.getKeyword());
      case "LIST_COLUMNS" -> filterOptions(
          columnOptions(catalogService.listColumn(dataSourceId, values)),
          request.getKeyword());
      case "PREVIEW" -> ActionResult.data(catalogService.preview(dataSourceId, values));
      case "COUNT" -> ActionResult.data(catalogService.count(dataSourceId, values));
      case "SQL_TEMPLATE" -> ActionResult.data(catalogService.buildSqlTemplate(dataSourceId, values));
      case "RESOLVE_SQL" -> ActionResult.data(catalogService.resolveSql(dataSourceId, values));
      default -> throw new IllegalArgumentException("不支持的 Connector Form Action：" + action);
    };
  }

  private ActionResult filterOptions(ActionResult result, String keyword) {
    if (keyword == null || keyword.isBlank()) {
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
