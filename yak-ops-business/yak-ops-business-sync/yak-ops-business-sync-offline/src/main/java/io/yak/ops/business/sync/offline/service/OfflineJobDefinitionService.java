package io.yak.ops.business.sync.offline.service;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.yak.ops.business.datasource.dao.DataSourceDao;
import io.yak.ops.business.sync.offline.dao.mapper.OfflineJobDefinitionMapper;
import io.yak.ops.business.sync.offline.engine.LinkUpHoconBuilder;
import io.yak.ops.business.sync.offline.model.po.OfflineJobDefinitionPO;
import io.yak.ops.common.bean.po.datasource.DataSourcePO;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
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

  private final OfflineJobDefinitionMapper mapper;
  private final DataSourceDao dataSourceDao;
  private final LinkUpHoconBuilder hoconBuilder;
  private final OfflineExecutionSynchronizer synchronizer;
  private final ObjectMapper objectMapper;
  private final AtomicLong idSequence = new AtomicLong(System.currentTimeMillis() * 1000L);

  public OfflineJobDefinitionService(
      OfflineJobDefinitionMapper mapper,
      DataSourceDao dataSourceDao,
      LinkUpHoconBuilder hoconBuilder,
      OfflineExecutionSynchronizer synchronizer,
      @Qualifier("offlineSyncJsonMapper") ObjectMapper objectMapper) {
    this.mapper = mapper;
    this.dataSourceDao = dataSourceDao;
    this.hoconBuilder = hoconBuilder;
    this.synchronizer = synchronizer;
    this.objectMapper = objectMapper;
  }

  public Long nextId() {
    long floor = System.currentTimeMillis() * 1000L;
    long candidate = idSequence.updateAndGet(current -> Math.max(current + 1L, floor));
    while (mapper.selectById(candidate) != null) {
      candidate = idSequence.incrementAndGet();
    }
    return candidate;
  }

  @Transactional(transactionManager = "offlineSyncTransactionManager", rollbackFor = Exception.class)
  public Long saveGuide(JsonNode request) {
    if (request == null || !request.isObject()) {
      throw new IllegalArgumentException("任务定义不能为空");
    }
    Long id = request.path("id").asLong(0L);
    if (id == null || id <= 0L) {
      id = nextId();
      ((ObjectNode) request).put("id", id);
    }
    JsonNode basic = request.path("basic");
    String jobName = requiredText(basic, "jobName", "任务名称不能为空");
    String jobDesc = text(basic, "jobDesc", null);
    String mode = text(basic, "mode", text(request, "mode", "GUIDE_SINGLE"));
    ensureNameUnique(jobName, id);

    OfflineJobDefinitionPO existing = mapper.selectById(id);
    ensureEditable(existing);
    LinkUpHoconBuilder.BuildResult result = hoconBuilder.build(request);
    LocalDateTime now = LocalDateTime.now();
    OfflineJobDefinitionPO definition = existing == null ? new OfflineJobDefinitionPO() : existing;
    definition.setId(id);
    definition.setJobName(jobName.trim());
    definition.setJobDesc(trimToNull(jobDesc));
    definition.setMode(mode);
    definition.setDefinitionJson(write(request));
    definition.setHoconConfig(result.getHocon());
    definition.setSourceType(enumName(result.getSourceDataSource()));
    definition.setSinkType(enumName(result.getSinkDataSource()));
    definition.setSourceDatasourceId(result.getSourceDataSource().getId());
    definition.setSinkDatasourceId(result.getSinkDataSource().getId());
    definition.setSourceTable(result.getSourceTable());
    definition.setSinkTable(result.getSinkTable());
    definition.setScheduleJson(writeNullable(request.get("schedule")));
    definition.setEnvJson(writeNullable(request.get("env")));
    definition.setVersion(existing == null || existing.getVersion() == null ? 1 : existing.getVersion() + 1);
    definition.setReleaseState(existing == null ? "OFFLINE" : existing.getReleaseState());
    definition.setCreateTime(existing == null ? now : existing.getCreateTime());
    definition.setUpdateTime(now);
    if (existing == null) {
      mapper.insert(definition);
    } else {
      mapper.updateById(definition);
    }
    return id;
  }

  @Transactional(transactionManager = "offlineSyncTransactionManager", rollbackFor = Exception.class)
  public Long saveScript(JsonNode request) {
    if (request == null || !request.isObject()) {
      throw new IllegalArgumentException("脚本任务定义不能为空");
    }
    long id = request.path("id").asLong(0L);
    if (id <= 0L) {
      id = nextId();
      ((ObjectNode) request).put("id", id);
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
    OfflineJobDefinitionPO existing = mapper.selectById(id);
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
      mapper.insert(definition);
    } else {
      mapper.updateById(definition);
    }
    return id;
  }

  public String buildGuideConfig(JsonNode request) {
    return hoconBuilder.build(request).getHocon();
  }

  public String buildScriptConfig(JsonNode request) {
    String hocon = firstText(request, request == null ? null : request.path("basic"),
        "hoconConfig", "jobDefinitionInfo", "script");
    if (!StringUtils.hasText(hocon)) {
      throw new IllegalArgumentException("SCRIPT 模式必须填写 Link-Up HOCON 配置");
    }
    return hocon;
  }

  public Map<String, Object> get(Long id) {
    OfflineJobDefinitionPO definition = require(id);
    synchronizer.refreshDefinition(definition);
    return toView(definition);
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
    state.put("lastExecutionId", definition.getLastExecutionId());
    state.put("lastEngineJobId", definition.getLastEngineJobId());
    return detail;
  }

  public Map<String, Object> page(JsonNode request) {
    int current = Math.max(1, request == null ? 1 : request.path("current").asInt(1));
    int pageSize = Math.min(200, Math.max(1, request == null ? 10 : request.path("pageSize").asInt(10)));
    LambdaQueryWrapper<OfflineJobDefinitionPO> query = new LambdaQueryWrapper<>();
    if (request != null) {
      String jobName = text(request, "jobName", null);
      if (StringUtils.hasText(jobName)) {
        query.like(OfflineJobDefinitionPO::getJobName, jobName.trim());
      }
      long id = request.path("id").asLong(0L);
      if (id > 0L) {
        query.eq(OfflineJobDefinitionPO::getId, id);
      }
      String status = normalizeQueryStatus(text(request, "status", null));
      if (StringUtils.hasText(status)) {
        query.eq(OfflineJobDefinitionPO::getLastJobStatus, status);
      }
      addLike(query, OfflineJobDefinitionPO::getSourceType, text(request, "sourceType", null));
      addLike(query, OfflineJobDefinitionPO::getSinkType, text(request, "sinkType", null));
      addLike(query, OfflineJobDefinitionPO::getSourceTable, text(request, "sourceTable", null));
      addLike(query, OfflineJobDefinitionPO::getSinkTable, text(request, "sinkTable", null));
      LocalDateTime start = parseDateTime(text(request, "createTimeStart", null));
      LocalDateTime end = parseDateTime(text(request, "createTimeEnd", null));
      if (start != null) {
        query.ge(OfflineJobDefinitionPO::getCreateTime, start);
      }
      if (end != null) {
        query.le(OfflineJobDefinitionPO::getCreateTime, end);
      }
    }
    query.orderByDesc(OfflineJobDefinitionPO::getUpdateTime)
        .orderByDesc(OfflineJobDefinitionPO::getId);
    Page<OfflineJobDefinitionPO> page = mapper.selectPage(new Page<>(current, pageSize), query);
    List<Map<String, Object>> records = new ArrayList<>();
    for (OfflineJobDefinitionPO definition : page.getRecords()) {
      synchronizer.refreshDefinition(definition);
      records.add(toView(definition));
    }
    Map<String, Object> pagination = new LinkedHashMap<>();
    pagination.put("total", page.getTotal());
    pagination.put("pages", page.getPages());
    pagination.put("pageNo", current);
    pagination.put("pageSize", pageSize);
    Map<String, Object> data = new LinkedHashMap<>();
    data.put("bizData", records);
    data.put("pagination", pagination);
    return data;
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
      definition.setHoconConfig(result.getHocon());
    }
    definition.setReleaseState("ONLINE");
    definition.setUpdateTime(LocalDateTime.now());
    mapper.updateById(definition);
    return true;
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
    mapper.updateById(definition);
    return true;
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
    return mapper.deleteById(id) > 0;
  }

  public OfflineJobDefinitionPO require(Long id) {
    if (id == null || id <= 0L) {
      throw new IllegalArgumentException("任务定义 ID 不合法");
    }
    OfflineJobDefinitionPO definition = mapper.selectById(id);
    if (definition == null) {
      throw new IllegalArgumentException("离线同步任务不存在：" + id);
    }
    return definition;
  }

  private Map<String, Object> toView(OfflineJobDefinitionPO definition) {
    DataSourcePO source = dataSource(definition.getSourceDatasourceId());
    DataSourcePO sink = dataSource(definition.getSinkDatasourceId());
    JsonNode schedule = readNullable(definition.getScheduleJson());
    String cronExpression = text(schedule, "cronExpression", null);
    String scheduleRunType = text(schedule, "scheduleRunType", "pause");
    boolean scheduled = StringUtils.hasText(cronExpression) && !"pause".equalsIgnoreCase(scheduleRunType);

    Map<String, Object> view = new LinkedHashMap<>();
    view.put("id", definition.getId());
    view.put("jobName", definition.getJobName());
    view.put("jobDesc", definition.getJobDesc());
    view.put("jobType", "BATCH");
    view.put("mode", definition.getMode());
    view.put("releaseState", definition.getReleaseState());
    view.put("sourceType", definition.getSourceType());
    view.put("sinkType", definition.getSinkType());
    view.put("sourceDatasourceId", definition.getSourceDatasourceId());
    view.put("sinkDatasourceId", definition.getSinkDatasourceId());
    view.put("sourceDatasourceName", source == null ? null : source.getName());
    view.put("sinkDatasourceName", sink == null ? null : sink.getName());
    view.put("sourceTable", definition.getSourceTable());
    view.put("sinkTable", definition.getSinkTable());
    view.put("lastJobStatus", definition.getLastJobStatus());
    view.put("lastErrorMessage", definition.getLastErrorMessage());
    view.put("instanceId", definition.getLastExecutionId());
    view.put("engineJobId", definition.getLastEngineJobId());
    view.put("runMode", scheduled ? "SCHEDULE" : "MANUAL");
    view.put("duration", seconds(definition.getLastDurationMillis()));
    view.put("readRowCount", value(definition.getLastReadRowCount()));
    view.put("qps", value(definition.getLastQps()));
    view.put("syncSize", formatBytes(definition.getLastSyncBytes()));
    view.put("cronExpression", cronExpression);
    view.put("scheduleStatus", scheduled ? "NORMAL" : "PAUSED");
    view.put("lastScheduleTime", format(definition.getLastStartTime()));
    view.put("nextScheduleTime", null);
    view.put("createTime", format(definition.getCreateTime()));
    view.put("updateTime", format(definition.getUpdateTime()));
    return view;
  }

  private <T> void addLike(
      LambdaQueryWrapper<OfflineJobDefinitionPO> query,
      com.baomidou.mybatisplus.core.toolkit.support.SFunction<OfflineJobDefinitionPO, T> column,
      String value) {
    if (StringUtils.hasText(value)) {
      query.like(column, value.trim());
    }
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
    LambdaQueryWrapper<OfflineJobDefinitionPO> query =
        new LambdaQueryWrapper<OfflineJobDefinitionPO>()
            .eq(OfflineJobDefinitionPO::getJobName, name.trim());
    if (excludedId != null) {
      query.ne(OfflineJobDefinitionPO::getId, excludedId);
    }
    if (mapper.selectCount(query) > 0L) {
      throw new IllegalArgumentException("离线同步任务名称已存在：" + name.trim());
    }
  }

  private String enumName(DataSourcePO dataSource) {
    return dataSource.getDbType() == null ? null : dataSource.getDbType().name();
  }

  private DataSourcePO dataSource(Long id) {
    return id == null ? null : dataSourceDao.selectById(id);
  }

  private String normalizeQueryStatus(String status) {
    if (!StringUtils.hasText(status)) {
      return null;
    }
    String normalized = status.trim().toUpperCase(Locale.ROOT);
    return "COMPLETED".equals(normalized) || "SUCCEEDED".equals(normalized)
        ? "FINISHED"
        : normalized;
  }

  private LocalDateTime parseDateTime(String value) {
    if (!StringUtils.hasText(value)) {
      return null;
    }
    try {
      return LocalDateTime.parse(value.trim(), DATE_TIME_FORMATTER);
    } catch (DateTimeParseException exception) {
      throw new IllegalArgumentException("时间格式必须为 yyyy-MM-dd HH:mm:ss：" + value, exception);
    }
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
    double value = bytes;
    String[] units = {"B", "KB", "MB", "GB", "TB"};
    int unit = 0;
    while (value >= 1024D && unit < units.length - 1) {
      value /= 1024D;
      unit++;
    }
    return String.format(Locale.ROOT, "%.2f %s", value, units[unit]);
  }
}
