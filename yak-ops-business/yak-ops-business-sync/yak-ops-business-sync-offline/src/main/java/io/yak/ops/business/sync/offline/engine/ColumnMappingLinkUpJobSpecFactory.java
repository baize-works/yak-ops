package io.yak.ops.business.sync.offline.engine;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.yak.ops.business.datasource.dao.DataSourceDao;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import java.util.HashSet;
import java.util.Set;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Adds Yak Ops' fixed single-table column mapping contract to Link-Up JobSpec.
 *
 * <p>The existing factory remains responsible for connector and runtime
 * compilation. This primary specialization only normalizes mapping metadata,
 * keeping the mapping independent from connector options.</p>
 */
@Primary
@Component
@ConditionalOnOfflineSyncEnabled
public class ColumnMappingLinkUpJobSpecFactory extends LinkUpJobSpecFactory {

  private final ObjectMapper objectMapper;

  public ColumnMappingLinkUpJobSpecFactory(
      DataSourceDao dataSourceDao,
      @Qualifier("offlineSyncJsonMapper") ObjectMapper objectMapper) {
    super(dataSourceDao, objectMapper);
    this.objectMapper = objectMapper;
  }

  @Override
  public BuildResult build(JsonNode definition) {
    BuildResult base = super.build(definition);
    ObjectNode mapping = normalizeMapping(definition);
    if (mapping == null) {
      return base;
    }

    String mode = definition.path("basic").path("mode").asText("GUIDE_SINGLE");
    if (!"GUIDE_SINGLE".equalsIgnoreCase(mode)) {
      throw new IllegalArgumentException("多表同步暂不支持自定义字段映射");
    }

    ObjectNode jobSpec = (ObjectNode) base.getJobSpec().deepCopy();
    jobSpec.set("mapping", mapping);

    return new BuildResult(
        jobSpec,
        write(jobSpec),
        base.getSourceDataSource(),
        base.getSinkDataSource(),
        base.getSourceConnectorId(),
        base.getSinkConnectorId(),
        base.getSourceTable(),
        base.getSinkTable());
  }

  private ObjectNode normalizeMapping(JsonNode definition) {
    JsonNode mapping = definition.get("mapping");
    if (mapping == null || !mapping.isObject()) {
      mapping = definition.path("source").path("config").path("mapping");
    }

    JsonNode columns = mapping.path("columns");
    if (!columns.isArray() || columns.isEmpty()) {
      return null;
    }

    Set<String> sources = new HashSet<>();
    Set<String> targets = new HashSet<>();
    ArrayNode normalizedColumns = objectMapper.createArrayNode();

    for (JsonNode column : columns) {
      String source = text(column, "source", text(column, "sourceField", null));
      String target = text(column, "target", text(column, "targetField", null));
      if (!StringUtils.hasText(source) || !StringUtils.hasText(target)) {
        throw new IllegalArgumentException("字段映射的来源字段和目标字段不能为空");
      }
      source = source.trim();
      target = target.trim();
      if (!sources.add(source)) {
        throw new IllegalArgumentException("来源字段不能重复映射：" + source);
      }
      if (!targets.add(target)) {
        throw new IllegalArgumentException("目标字段不能重复映射：" + target);
      }
      normalizedColumns.addObject()
          .put("source", source)
          .put("target", target);
    }

    ObjectNode normalized = objectMapper.createObjectNode();
    normalized.set("columns", normalizedColumns);
    return normalized;
  }

  private String text(JsonNode node, String field, String fallback) {
    JsonNode value = node == null ? null : node.get(field);
    return value == null || value.isNull() ? fallback : value.asText(fallback);
  }

  private String write(JsonNode value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("序列化字段映射 JobSpec 失败", exception);
    }
  }
}
