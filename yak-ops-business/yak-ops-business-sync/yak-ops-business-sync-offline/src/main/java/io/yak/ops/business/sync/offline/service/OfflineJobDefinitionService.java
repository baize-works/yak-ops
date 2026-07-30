package io.yak.ops.business.sync.offline.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.yak.framework.common.PagingData;
import io.yak.ops.business.datasource.dao.DataSourceDao;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.dao.OfflineJobDefinitionDao;
import io.yak.ops.business.sync.offline.engine.LinkUpHoconBuilder;
import io.yak.ops.common.bean.dto.sync.offline.OfflineJobDefinitionDTO;
import io.yak.ops.common.bean.dto.sync.offline.OfflineJobDefinitionQueryDTO;
import io.yak.ops.common.bean.po.datasource.DataSourcePO;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobDefinitionPO;
import io.yak.ops.common.bean.vo.sync.offline.OfflineJobDefinitionVO;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/** 离线同步任务定义服务。 */
@ConditionalOnOfflineSyncEnabled
@Service
public class OfflineJobDefinitionService {

  private static final DateTimeFormatter DATE_TIME_FORMATTER =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

  private final OfflineJobDefinitionDao definitionDao;
  private final DataSourceDao dataSourceDao;
  private final LinkUpHoconBuilder hoconBuilder;
  private final OfflineExecutionSynchronizer synchronizer;
  private final ObjectMapper objectMapper;
  private final AtomicLong idSequence = new AtomicLong(System.currentTimeMillis() * 1000L);

  public OfflineJobDefinitionService(
      OfflineJobDefinitionDao definitionDao,
      DataSourceDao dataSourceDao,
      LinkUpHoconBuilder hoconBuilder,
      OfflineExecutionSynchronizer synchronizer,
      @Qualifier("offlineSyncJsonMapper") ObjectMapper objectMapper) {
    this.definitionDao = definitionDao;
    this.dataSourceDao = dataSourceDao;
    this.hoconBuilder = hoconBuilder;
    this.synchronizer = synchronizer;
    this.objectMapper = objectMapper;
  }

  public Long nextId() {
    long floor = System.currentTimeMillis() * 1000L;
    long candidate = idSequence.updateAndGet(current -> Math.max(current + 1L, floor));
    while (definitionDao.selectById(candidate) != null) {
      candidate = idSequence.incrementAndGet();
    }
    return candidate;
  }

  @Transactional(transactionManager = "offlineSyncTransactionManager", rollbackFor = Exception.class)
  public Long saveGuide(OfflineJobDefinitionDTO requestDTO) {
    ObjectNode request = toObjectNode(requestDTO, "任务定义不能为空");
    Long id = requestDTO.getId();
    if (id == null || id <= 0L) {
      id = nextId();
      requestDTO.setId(id);
      request.put("id", id);
    }
    JsonNode basic = request.path("basic");
    String jobName = requiredText(basic, "jobName", "任务名称不能为空");
    String jobDesc = text(basic, "jobDesc", null);
    String mode = text(basic, "mode", text(request, "mode", "GUIDE_SINGLE"));
    ensureGuideMode(mode);
    ensureNameUnique(jobName, id);

    OfflineJobDefinitionPO existing = definitionDao.selectById(id);
    ensureEditable(existing);
    LinkUpHoconBuilder.BuildResult result =
        isGuideReady(request, mode) ? hoconBuilder.build(request) : null;
    LocalDateTime now = LocalDateTime.now();
    OfflineJobDefinitionPO definition = existing == null ? new OfflineJobDefinitionPO() : existing;
    definition.setId(id);
    definition.setJobName(jobName.trim());
    definition.setJobDesc(trimToNull(jobDesc));
    definition.setMode(mode);
    definition.setDefinitionJson(write(request));
    applyGuideBuildResult(definition, result);
    definition.setScheduleJson(writeNullable(request.get("schedule")));
    definition.setEnvJson(writeNullable(request.get("env")));
    definition.setVersion(existing == null || existing.getVersion() == null ? 1 : existing.getVersion() + 1);
    definition.setReleaseState(existing == null ? "OFFLINE" : existing.getReleaseState());
    definition.setCreateTime(existing == null ? now : existing.getCreateTime());
    definition.setUpdateTime(now);
    if (existing == null) {
      definitionDao.insert(definition);
    } else {
      definitionDao.updateById(definition);
    }
    return id;
  }

  @Transactional(transactionManager = "offlineSyncTransactionManager", rollbackFor = Exception.class)
  public Long saveScript(OfflineJobDefinitionDTO requestDTO) {
    ObjectNode request = toObjectNode(requestDTO, "脚本任务定义不能为空");
    Long id = requestDTO.getId();
    if (id == null || id <= 0L) {
      id = nextId();
      requestDTO.setId(id);
      request.put("id", id);
    }
    JsonNode basic = request.path("basic");
    String jobName = firstText(request, basic, "jobName");
    if (!StringUtils.hasText(jobName)) {
      throw new IllegalArgumentException("任务名称不能为空");
    }
    String hocon = firstText(request, basic, "hoconConfig", "jobDefinitionInfo", "script");
    if (!StringUtils.hasText(hocon)) {
      throw new IllegalArgumentException("SCRIPT 模式必须填写 Link-Up HOCON 配置");
    }
    ensureNameUnique(jobName, id);
    OfflineJobDefinitionPO existing = definitionDao.selectById(id);
    ensureEditable(existing);
    LocalDateTime now = LocalDateTime.now();
    OfflineJobDefinitionPO definition = existing == null ? new OfflineJobDefinitionPO() : existing;
    definition.setId(id);
    definition.setJobName(jobName.trim());
    definition.setJobDesc(trimToNull(firstText(request, basic, "jobDesc")));
    definition.setMode("SCRIPT");
    definition.setDefinitionJson(write(request));
    definition.setHoconConfig(hocon.trim());
    definition.setScheduleJson(writeNullable(request.get("schedule")));
    definition.setEnvJson(writeNullable(request.get("env")));
    definition.setVersion(existing == null || existing.getVersion() == null ? 1 : existing.getVersion() + 1);
    definition.setReleaseState(existing == null ? "OFFLINE" : existing.getReleaseState());
    definition.setCreateTime(existing == null ? now : existing.getCreateTime());
    definition.setUpdateTime(now);
    if (existing == null) {
      definitionDao.insert(definition);
    } else {
      definitionDao.updateById(definition);
    }
    return id;
  }

  public String buildGuideConfig(OfflineJobDefinitionDTO requestDTO) {
    return hoconBuilder.build(toObjectNode(requestDTO, "任务定义不能为空")).getHocon();
  }

  public String buildScriptConfig(OfflineJobDefinitionDTO requestDTO) {
    ObjectNode request = toObjectNode(requestDTO, "脚本任务定义不能为空");
    String hocon = firstText(request, request.path("basic"),
        "hoconConfig", "jobDefinitionInfo", "script");
    if (!StringUtils.hasText(hocon)) {
      throw new IllegalArgumentException("SCRIPT 模式必须填写 Link-Up HOCON 配置");
    }
    return hocon.trim();
  }

  public OfflineJobDefinitionVO get(Long id) {
    OfflineJobDefinitionPO definition = require(id);
    synchronizer.refreshDefinition(definition);
    return toVO(definition);
  }

  public JsonNode getEditDetail(Long id) {
    OfflineJobDefinitionPO definition = require(id);
    JsonNode parsed = read(definition.getDefinitionJson());
    ObjectNode detail = parsed != null && parsed.isObject()
        ? (ObjectNode) parsed.deepCopy()
        : objectMapper.createObjectNode();
    detail.put("id", definition.getId());
    detail.put("mode", definition.getMode());
    ObjectNode state = detail.with("state");
    state.put("releaseState", definition.getReleaseState());
    state.put("lastJobStatus", definition.getLastJobStatus());
    state.put("lastErrorMessage", definition.getLastErrorMessage());
    state.set("lastExecutionId", objectMapper.valueToTree(definition.getLastExecutionId()));
    state.put("lastEngineJobId", definition.getLastEngineJobId());
    return detail;
  }

  public PagingData<OfflineJobDefinitionVO> page(OfflineJobDefinitionQueryDTO queryDTO) {
    IPage<OfflineJobDefinitionPO> page = definitionDao.selectPage(queryDTO);
    List<OfflineJobDefinitionVO> records = new ArrayList<>(page.getRecords().size());
    for (OfflineJobDefinitionPO definition : page.getRecords()) {
      synchronizer.refreshDefinition(definition);
      records.add(toVO(definition));
    }
    return new PagingData<>(records, page);
  }

  @Transactional(transactionManager = "offlineSyncTransactionManager", rollbackFor = Exception.class)
  public boolean online(Long id) {
    OfflineJobDefinitionPO definition = require(id);
    if ("SCRIPT".equals(definition.getMode())) {
      if (!StringUtils.hasText(definition.getHoconConfig())) {
        throw new IllegalStateException("任务没有可提交的 Link-Up HOCON 配置");
      }
    } else {
      JsonNode detail = read(definition.getDefinitionJson());
      LinkUpHoconBuilder.BuildResult result = hoconBuilder.build(detail);
      applyGuideBuildResult(definition, result);
    }
    definition.setReleaseState("ONLINE");
    definition.setUpdateTime(LocalDateTime.now());
    return definitionDao.updateById(definition);
  }

  @Transactional(transactionManager = "offlineSyncTransactionManager", rollbackFor = Exception.class)
  public boolean offline(Long id) {
    OfflineJobDefinitionPO definition = require(id);
    synchronizer.refreshDefinition(definition);
    if (synchronizer.isActive(definition.getLastJobStatus())) {
      throw new IllegalStateException("运行中的任务不能下线，请先停止任务");
    }
    definition.setReleaseState("OFFLINE");
    definition.setUpdateTime(LocalDateTime.now());
    return definitionDao.updateById(definition);
  }

  @Transactional(transactionManager = "offlineSyncTransactionManager", rollbackFor = Exception.class)
  public boolean delete(Long id) {
    OfflineJobDefinitionPO definition = require(id);
    synchronizer.refreshDefinition(definition);
    if ("ONLINE".equalsIgnoreCase(definition.getReleaseState())) {
      throw new IllegalStateException("已上线任务不能删除，请先下线");
    }
    if (synchronizer.isActive(definition.getLastJobStatus())) {
      throw new IllegalStateException("运行中的任务不能删除，请先停止任务");
    }
    return definitionDao.deleteById(id);
  }

  public OfflineJobDefinitionPO require(Long id) {
    if (id == null || id <= 0L) {
      throw new IllegalArgumentException("任务定义 ID 不合法");
    }
    OfflineJobDefinitionPO definition = definitionDao.selectById(id);
    if (definition == null) {
      throw new IllegalArgumentException("离线同步任务不存在：" + id);
    }
    return definition;
  }

  private OfflineJobDefinitionVO toVO(OfflineJobDefinitionPO definition) {
    DataSourcePO source = dataSource(definition.getSourceDatasourceId());
    DataSourcePO sink = dataSource(definition.getSinkDatasourceId());
    JsonNode schedule = readNullable(definition.getScheduleJson());
    String cronExpression = text(schedule, "cronExpression", null);
    String scheduleRunType = text(schedule, "scheduleRunType", "pause");
    boolean scheduled = StringUtils.hasText(cronExpression)
        && !"pause".equalsIgnoreCase(scheduleRunType);

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
        .lastScheduleTime(format(definition.getLastStartTime()))
        .nextScheduleTime(null)
        .createTime(format(definition.getCreateTime()))
        .updateTime(format(definition.getUpdateTime()))
        .build();
  }

  private void ensureEditable(OfflineJobDefinitionPO existing) {
    if (existing == null) {
      return;
    }
    synchronizer.refreshDefinition(existing);
    if ("ONLINE".equalsIgnoreCase(existing.getReleaseState())) {
      throw new IllegalStateException("已上线任务不能修改，请先下线");
    }
    if (synchronizer.isActive(existing.getLastJobStatus())) {
      throw new IllegalStateException("运行中的任务不能修改");
    }
  }

  private void ensureNameUnique(String name, Long excludedId) {
    String normalized = name.trim();
    if (definitionDao.existsByName(normalized, excludedId)) {
      throw new IllegalArgumentException("离线同步任务名称已存在：" + normalized);
    }
  }

  private void ensureGuideMode(String mode) {
    if (!"GUIDE_SINGLE".equals(mode) && !"GUIDE_MULTI".equals(mode)) {
      throw new IllegalArgumentException("仅支持 GUIDE_SINGLE 和 GUIDE_MULTI 向导模式");
    }
  }

  private boolean isGuideReady(JsonNode request, String mode) {
    JsonNode workflow = request.path("workflow");
    JsonNode basic = request.path("basic");
    if (!workflow.isObject()) {
      return false;
    }
    JsonNode source = endpointConfig(workflow, "source");
    JsonNode sink = endpointConfig(workflow, "sink");
    if (source == null || sink == null) {
      return false;
    }
    if (resolveDataSourceId(source, basic, workflow, true) <= 0L
        || resolveDataSourceId(sink, basic, workflow, false) <= 0L) {
      return false;
    }
    if ("GUIDE_MULTI".equals(mode)) {
      return hasConfiguredTables(source.path("tables"))
          || StringUtils.hasText(text(source, "tablePattern", null));
    }
    boolean sourceReady = "sql".equalsIgnoreCase(text(source, "readMode", "table"))
        ? StringUtils.hasText(text(source, "sql", null))
        : StringUtils.hasText(text(source, "table", null));
    boolean sinkReady = StringUtils.hasText(
        text(sink, "targetTableName", text(sink, "table", null)));
    return sourceReady && sinkReady;
  }

  private JsonNode endpointConfig(JsonNode workflow, String kind) {
    JsonNode nodes = workflow.path("nodes");
    if (!nodes.isArray()) {
      return null;
    }
    for (JsonNode node : nodes) {
      String nodeType = text(node.path("data"), "nodeType", text(node, "type", null));
      if (kind.equalsIgnoreCase(nodeType)) {
        JsonNode config = node.path("data").path("config");
        return config.isObject() ? config : null;
      }
    }
    return null;
  }

  private long resolveDataSourceId(
      JsonNode config, JsonNode basic, JsonNode workflow, boolean source) {
    long id = config.path("dataSourceId").asLong(0L);
    if (id <= 0L) {
      id = basic.path(source ? "sourceDataSourceId" : "targetDataSourceId").asLong(0L);
    }
    if (id <= 0L) {
      id = workflow.path(source ? "sourceDataSourceId" : "targetDataSourceId").asLong(0L);
    }
    return id;
  }

  private boolean hasConfiguredTables(JsonNode tables) {
    if (tables == null || tables.isNull() || tables.isMissingNode()) {
      return false;
    }
    if (tables.isTextual()) {
      return StringUtils.hasText(tables.asText());
    }
    if (tables.isArray()) {
      for (JsonNode table : tables) {
        if (hasConfiguredTables(table)) {
          return true;
        }
      }
      return false;
    }
    if (tables.isObject()) {
      var values = tables.elements();
      while (values.hasNext()) {
        if (hasConfiguredTables(values.next())) {
          return true;
        }
      }
    }
    return false;
  }

  private void applyGuideBuildResult(
      OfflineJobDefinitionPO definition, LinkUpHoconBuilder.BuildResult result) {
    if (result == null) {
      definition.setHoconConfig("");
      definition.setSourceType(null);
      definition.setSinkType(null);
      definition.setSourceDatasourceId(null);
      definition.setSinkDatasourceId(null);
      definition.setSourceTable(null);
      definition.setSinkTable(null);
      return;
    }
    definition.setHoconConfig(result.getHocon());
    definition.setSourceType(enumName(result.getSourceDataSource()));
    definition.setSinkType(enumName(result.getSinkDataSource()));
    definition.setSourceDatasourceId(result.getSourceDataSource().getId());
    definition.setSinkDatasourceId(result.getSinkDataSource().getId());
    definition.setSourceTable(result.getSourceTable());
    definition.setSinkTable(result.getSinkTable());
  }

  private String enumName(DataSourcePO dataSource) {
    return dataSource.getDbType() == null ? null : dataSource.getDbType().name();
  }

  private DataSourcePO dataSource(Long id) {
    return id == null ? null : dataSourceDao.selectById(id);
  }

  private ObjectNode toObjectNode(OfflineJobDefinitionDTO requestDTO, String message) {
    if (requestDTO == null) {
      throw new IllegalArgumentException(message);
    }
    JsonNode value = objectMapper.valueToTree(requestDTO);
    if (!value.isObject()) {
      throw new IllegalArgumentException(message);
    }
    return (ObjectNode) value;
  }

  private JsonNode read(String value) {
    if (!StringUtils.hasText(value)) {
      return objectMapper.createObjectNode();
    }
    try {
      return objectMapper.readTree(value);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("任务定义 JSON 已损坏", exception);
    }
  }

  private JsonNode readNullable(String value) {
    return StringUtils.hasText(value) ? read(value) : objectMapper.createObjectNode();
  }

  private String write(JsonNode value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("序列化任务定义失败", exception);
    }
  }

  private String writeNullable(JsonNode value) {
    return value == null || value.isMissingNode() || value.isNull() ? null : write(value);
  }

  private String requiredText(JsonNode node, String field, String message) {
    String value = text(node, field, null);
    if (!StringUtils.hasText(value)) {
      throw new IllegalArgumentException(message);
    }
    return value;
  }

  private String text(JsonNode node, String field, String fallback) {
    if (node == null || node.isMissingNode() || node.isNull()) {
      return fallback;
    }
    JsonNode value = node.get(field);
    return value == null || value.isNull() || !value.isValueNode()
        ? fallback
        : value.asText(fallback);
  }

  private String firstText(JsonNode first, JsonNode second, String... fields) {
    for (String field : fields) {
      String value = text(first, field, null);
      if (!StringUtils.hasText(value)) {
        value = text(second, field, null);
      }
      if (StringUtils.hasText(value)) {
        return value;
      }
    }
    return null;
  }

  private String trimToNull(String value) {
    return StringUtils.hasText(value) ? value.trim() : null;
  }

  private String format(LocalDateTime value) {
    return value == null ? null : value.format(DATE_TIME_FORMATTER);
  }

  private long seconds(Long durationMillis) {
    return durationMillis == null ? 0L : Math.max(0L, durationMillis / 1000L);
  }

  private long value(Long number) {
    return number == null ? 0L : number;
  }

  private double value(Double number) {
    return number == null ? 0D : number;
  }

  private String formatBytes(Long bytes) {
    if (bytes == null || bytes <= 0L) {
      return "-";
    }
    double size = bytes;
    String[] units = {"B", "KB", "MB", "GB", "TB"};
    int unit = 0;
    while (size >= 1024D && unit < units.length - 1) {
      size /= 1024D;
      unit++;
    }
    return String.format(Locale.ROOT, "%.2f %s", size, units[unit]);
  }
}
