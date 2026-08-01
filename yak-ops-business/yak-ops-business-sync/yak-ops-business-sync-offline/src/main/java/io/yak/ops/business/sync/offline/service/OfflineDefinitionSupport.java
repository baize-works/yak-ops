package io.yak.ops.business.sync.offline.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.yak.ops.business.datasource.dao.DataSourceDao;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.engine.LinkUpJobSpecFactory;
import io.yak.ops.common.bean.dto.sync.offline.OfflineJobDefinitionDTO;
import io.yak.ops.common.bean.po.datasource.DataSourcePO;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobDefinitionPO;
import io.yak.ops.common.bean.vo.sync.offline.OfflineJobDefinitionVO;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/** Task definition serialization, structured JobSpec generation and view mapping. */
@ConditionalOnOfflineSyncEnabled
@Component
public class OfflineDefinitionSupport {

  private static final DateTimeFormatter FORMAT =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

  private final LinkUpJobSpecFactory jobSpecFactory;
  private final DataSourceDao dataSourceDao;
  private final ObjectMapper objectMapper;

  public OfflineDefinitionSupport(
      LinkUpJobSpecFactory jobSpecFactory,
      DataSourceDao dataSourceDao,
      @Qualifier("offlineSyncJsonMapper") ObjectMapper objectMapper) {
    this.jobSpecFactory = jobSpecFactory;
    this.dataSourceDao = dataSourceDao;
    this.objectMapper = objectMapper;
  }

  public PreparedDefinition prepare(OfflineJobDefinitionDTO requestDTO) {
    ObjectNode request = object(requestDTO);
    JsonNode basic = request.path("basic");
    String name = requiredText(basic, "jobName", "任务名称不能为空");
    String mode = text(basic, "mode", text(request, "mode", "GUIDE_SINGLE"));
    if (!"GUIDE_SINGLE".equals(mode) && !"GUIDE_MULTI".equals(mode)) {
      throw new IllegalArgumentException("离线同步仅支持 GUIDE_SINGLE 和 GUIDE_MULTI 模式");
    }
    LinkUpJobSpecFactory.BuildResult buildResult = jobSpecFactory.build(request);
    String definitionJson = write(request);
    return new PreparedDefinition(
        request,
        name.trim(),
        trim(text(basic, "jobDesc", null)),
        mode,
        definitionJson,
        buildResult.getJobSpecJson(),
        buildResult.getSourceDataSource(),
        buildResult.getSinkDataSource(),
        buildResult.getSourceConnectorId(),
        buildResult.getSinkConnectorId(),
        buildResult.getSourceTable(),
        buildResult.getSinkTable(),
        digest(buildResult.getJobSpecJson()));
  }

  public String buildJobSpec(OfflineJobDefinitionDTO requestDTO) {
    return prepare(requestDTO).getJobSpecJson();
  }

  public String buildJobSpec(String definitionJson) {
    JsonNode parsed = read(definitionJson);
    if (parsed == null || !parsed.isObject()) {
      throw new IllegalStateException("任务定义 JSON 已损坏");
    }
    return jobSpecFactory.build(parsed).getJobSpecJson();
  }

  public JsonNode editDetail(OfflineJobDefinitionPO definition) {
    JsonNode parsed = read(definition.getDefinitionJson());
    ObjectNode detail = parsed != null && parsed.isObject()
        ? (ObjectNode) parsed.deepCopy() : objectMapper.createObjectNode();
    detail.put("id", definition.getId());
    detail.put("mode", definition.getMode());
    ObjectNode state = detail.with("state");
    state.put("releaseState", definition.getReleaseState());
    state.put("lastJobStatus", definition.getLastJobStatus());
    state.put("lastErrorMessage", definition.getLastErrorMessage());
    state.set("lastExecutionId", objectMapper.valueToTree(definition.getLastExecutionId()));
    state.put("lastEngineJobId", definition.getLastEngineJobId());
    state.set("currentVersionId", objectMapper.valueToTree(definition.getCurrentVersionId()));
    return detail;
  }

  public OfflineJobDefinitionVO toVO(
      OfflineJobDefinitionPO definition,
      String cronExpression,
      boolean scheduled,
      LocalDateTime lastFireTime,
      LocalDateTime nextFireTime) {
    DataSourcePO source = dataSource(definition.getSourceDatasourceId());
    DataSourcePO sink = dataSource(definition.getSinkDatasourceId());
    return OfflineJobDefinitionVO.builder()
        .id(definition.getId())
        .jobName(definition.getJobName())
        .jobDesc(definition.getJobDesc())
        .jobType("BATCH")
        .mode(definition.getMode())
        .releaseState(definition.getReleaseState())
        .sourceType(definition.getSourceType())
        .sinkType(definition.getSinkType())
        .sourceDatasourceId(definition.getSourceDatasourceId())
        .sinkDatasourceId(definition.getSinkDatasourceId())
        .sourceDatasourceName(source == null ? null : source.getName())
        .sinkDatasourceName(sink == null ? null : sink.getName())
        .sourceTable(definition.getSourceTable())
        .sinkTable(definition.getSinkTable())
        .lastJobStatus(definition.getLastJobStatus())
        .lastErrorMessage(definition.getLastErrorMessage())
        .instanceId(definition.getLastExecutionId())
        .engineJobId(definition.getLastEngineJobId())
        .runMode(scheduled ? "SCHEDULE" : "MANUAL")
        .duration(seconds(definition.getLastDurationMillis()))
        .readRowCount(value(definition.getLastReadRowCount()))
        .qps(value(definition.getLastQps()))
        .syncSize(formatBytes(definition.getLastSyncBytes()))
        .cronExpression(cronExpression)
        .scheduleStatus(scheduled ? "NORMAL" : "PAUSED")
        .lastScheduleTime(format(lastFireTime == null ? definition.getLastStartTime() : lastFireTime))
        .nextScheduleTime(format(nextFireTime))
        .createTime(format(definition.getCreateTime()))
        .updateTime(format(definition.getUpdateTime()))
        .build();
  }

  public String writeNullable(JsonNode value) {
    return value == null || value.isMissingNode() || value.isNull() ? null : write(value);
  }

  private ObjectNode object(OfflineJobDefinitionDTO requestDTO) {
    if (requestDTO == null) throw new IllegalArgumentException("任务定义不能为空");
    JsonNode value = objectMapper.valueToTree(requestDTO);
    if (!value.isObject()) throw new IllegalArgumentException("任务定义格式不正确");
    return (ObjectNode) value;
  }

  private JsonNode read(String value) {
    if (!StringUtils.hasText(value)) return objectMapper.createObjectNode();
    try { return objectMapper.readTree(value); }
    catch (JsonProcessingException exception) {
      throw new IllegalStateException("任务定义 JSON 已损坏", exception);
    }
  }

  private String write(JsonNode value) {
    try { return objectMapper.writeValueAsString(value); }
    catch (JsonProcessingException exception) {
      throw new IllegalStateException("序列化任务定义失败", exception);
    }
  }

  private String digest(String jobSpecJson) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] value = digest.digest(jobSpecJson.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(value);
    } catch (Exception exception) {
      throw new IllegalStateException("生成 JobSpec 摘要失败", exception);
    }
  }

  private String requiredText(JsonNode node, String field, String message) {
    String value = text(node, field, null);
    if (!StringUtils.hasText(value)) throw new IllegalArgumentException(message);
    return value;
  }

  private String text(JsonNode node, String field, String fallback) {
    if (node == null || node.isMissingNode() || node.isNull()) return fallback;
    JsonNode value = node.get(field);
    return value == null || value.isNull() || !value.isValueNode()
        ? fallback : value.asText(fallback);
  }

  private String trim(String value) { return StringUtils.hasText(value) ? value.trim() : null; }
  private DataSourcePO dataSource(Long id) { return id == null ? null : dataSourceDao.selectById(id); }
  private String format(LocalDateTime value) { return value == null ? null : value.format(FORMAT); }
  private long seconds(Long millis) { return millis == null ? 0L : Math.max(0L, millis / 1000L); }
  private long value(Long number) { return number == null ? 0L : number; }
  private double value(Double number) { return number == null ? 0D : number; }

  private String formatBytes(Long bytes) {
    if (bytes == null || bytes <= 0L) return "-";
    double size = bytes;
    String[] units = {"B", "KB", "MB", "GB", "TB"};
    int unit = 0;
    while (size >= 1024D && unit < units.length - 1) { size /= 1024D; unit++; }
    return String.format(Locale.ROOT, "%.2f %s", size, units[unit]);
  }

  public static final class PreparedDefinition {
    private final ObjectNode request;
    private final String jobName;
    private final String jobDesc;
    private final String mode;
    private final String definitionJson;
    private final String jobSpecJson;
    private final DataSourcePO source;
    private final DataSourcePO sink;
    private final String sourceConnectorId;
    private final String sinkConnectorId;
    private final String sourceTable;
    private final String sinkTable;
    private final String digest;

    public PreparedDefinition(ObjectNode request, String jobName, String jobDesc, String mode,
        String definitionJson, String jobSpecJson, DataSourcePO source, DataSourcePO sink,
        String sourceConnectorId, String sinkConnectorId,
        String sourceTable, String sinkTable, String digest) {
      this.request = request; this.jobName = jobName; this.jobDesc = jobDesc; this.mode = mode;
      this.definitionJson = definitionJson; this.jobSpecJson = jobSpecJson; this.source = source;
      this.sink = sink; this.sourceConnectorId = sourceConnectorId;
      this.sinkConnectorId = sinkConnectorId; this.sourceTable = sourceTable; this.sinkTable = sinkTable;
      this.digest = digest;
    }
    public ObjectNode getRequest() { return request; }
    public String getJobName() { return jobName; }
    public String getJobDesc() { return jobDesc; }
    public String getMode() { return mode; }
    public String getDefinitionJson() { return definitionJson; }
    public String getJobSpecJson() { return jobSpecJson; }
    public DataSourcePO getSource() { return source; }
    public DataSourcePO getSink() { return sink; }
    public String getSourceConnectorId() { return sourceConnectorId; }
    public String getSinkConnectorId() { return sinkConnectorId; }
    public String getSourceTable() { return sourceTable; }
    public String getSinkTable() { return sinkTable; }
    public String getDigest() { return digest; }
  }
}
