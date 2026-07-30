package io.yak.ops.business.sync.offline.service;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.JsonNode;
import io.yak.ops.business.sync.offline.dao.mapper.OfflineJobDefinitionMapper;
import io.yak.ops.business.sync.offline.dao.mapper.OfflineJobExecutionMapper;
import io.yak.ops.business.sync.offline.engine.LinkUpClient;
import io.yak.ops.business.sync.offline.model.po.OfflineJobDefinitionPO;
import io.yak.ops.business.sync.offline.model.po.OfflineJobExecutionPO;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** 离线同步任务执行与 Link-Up 作业生命周期服务。 */
@ConditionalOnOfflineSyncEnabled
@Service
public class OfflineJobExecutionService {

  private static final DateTimeFormatter DATE_TIME_FORMATTER =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

  private final OfflineJobDefinitionService definitionService;
  private final OfflineJobDefinitionMapper definitionMapper;
  private final OfflineJobExecutionMapper executionMapper;
  private final OfflineExecutionSynchronizer synchronizer;
  private final LinkUpClient linkUpClient;

  public OfflineJobExecutionService(
      OfflineJobDefinitionService definitionService,
      OfflineJobDefinitionMapper definitionMapper,
      OfflineJobExecutionMapper executionMapper,
      OfflineExecutionSynchronizer synchronizer,
      LinkUpClient linkUpClient) {
    this.definitionService = definitionService;
    this.definitionMapper = definitionMapper;
    this.executionMapper = executionMapper;
    this.synchronizer = synchronizer;
    this.linkUpClient = linkUpClient;
  }

  public Map<String, Object> execute(Long definitionId) {
    OfflineJobDefinitionPO definition = definitionService.require(definitionId);
    synchronizer.refreshDefinition(definition);
    if (!"ONLINE".equalsIgnoreCase(definition.getReleaseState())) {
      throw new IllegalStateException("请先上线任务，再执行运行操作");
    }
    if (synchronizer.isActive(definition.getLastJobStatus())) {
      throw new IllegalStateException("任务正在运行中，不能重复提交");
    }
    if (!StringUtils.hasText(definition.getHoconConfig())) {
      throw new IllegalStateException("任务没有可提交的 Link-Up HOCON 配置");
    }

    LocalDateTime now = LocalDateTime.now();
    OfflineJobExecutionPO execution = new OfflineJobExecutionPO();
    execution.setJobDefinitionId(definitionId);
    execution.setStatus("SUBMITTED");
    execution.setSubmittedConfig(definition.getHoconConfig());
    execution.setSourceRecordCount(0L);
    execution.setSinkSuccessRecordCount(0L);
    execution.setSourceReadBytes(0L);
    execution.setSinkWrittenBytes(0L);
    execution.setQps(0D);
    execution.setDurationMillis(0L);
    execution.setCreateTime(now);
    execution.setUpdateTime(now);
    executionMapper.insert(execution);

    definition.setLastExecutionId(execution.getId());
    definition.setLastJobStatus("RUNNING");
    definition.setLastErrorMessage(null);
    definition.setUpdateTime(now);
    definitionMapper.updateById(definition);

    try {
      JsonNode summary = linkUpClient.submit(definition.getHoconConfig());
      String engineJobId = summary.path("jobId").asText(null);
      if (!StringUtils.hasText(engineJobId)) {
        throw new IllegalStateException("Link-Up 提交成功但未返回 jobId");
      }
      execution.setEngineJobId(engineJobId);
      definition.setLastEngineJobId(engineJobId);
      definitionMapper.updateById(definition);
      executionMapper.updateById(execution);
      synchronizer.apply(definition, execution, summary);
      return toView(execution);
    } catch (RuntimeException exception) {
      fail(definition, execution, exception.getMessage());
      throw exception;
    }
  }

  public Map<String, Object> cancel(Long executionId) {
    OfflineJobExecutionPO execution = require(executionId);
    synchronizer.refreshExecution(execution);
    if (!synchronizer.isActive(execution.getStatus())) {
      throw new IllegalStateException("当前任务实例已结束，无需停止");
    }
    if (!StringUtils.hasText(execution.getEngineJobId())) {
      throw new IllegalStateException("任务实例没有 Link-Up jobId");
    }
    JsonNode summary = linkUpClient.cancel(execution.getEngineJobId());
    OfflineJobDefinitionPO definition = definitionMapper.selectById(execution.getJobDefinitionId());
    synchronizer.apply(definition, execution, summary);
    return toView(execution);
  }

  public Map<String, Object> cancelLatest(Long definitionId) {
    OfflineJobDefinitionPO definition = definitionService.require(definitionId);
    if (definition.getLastExecutionId() == null) {
      throw new IllegalStateException("任务没有可停止的运行实例");
    }
    return cancel(definition.getLastExecutionId());
  }

  public Map<String, Object> batchExecute(JsonNode request) {
    return batch(request, true);
  }

  public Map<String, Object> batchCancel(JsonNode request) {
    return batch(request, false);
  }

  public Map<String, Object> get(Long executionId) {
    OfflineJobExecutionPO execution = require(executionId);
    synchronizer.refreshExecution(execution);
    return toView(execution);
  }

  public Map<String, Object> detail(Long executionId) {
    OfflineJobExecutionPO execution = require(executionId);
    synchronizer.refreshExecution(execution);
    Map<String, Object> detail = new LinkedHashMap<>();
    detail.put("execution", toView(execution));
    if (StringUtils.hasText(execution.getEngineJobId())) {
      detail.put("job", linkUpClient.getJob(execution.getEngineJobId()));
      detail.put("pipelines", linkUpClient.pipelines(execution.getEngineJobId()));
      detail.put("tasks", linkUpClient.tasks(execution.getEngineJobId()));
      detail.put("metrics", linkUpClient.metrics(execution.getEngineJobId()));
    }
    return detail;
  }

  public Object tableMetrics(Long executionId) {
    OfflineJobExecutionPO execution = require(executionId);
    if (!StringUtils.hasText(execution.getEngineJobId())) {
      return List.of();
    }
    return linkUpClient.pipelines(execution.getEngineJobId());
  }

  public String logs(Long executionId) {
    OfflineJobExecutionPO execution = require(executionId);
    synchronizer.refreshExecution(execution);
    StringBuilder log = new StringBuilder();
    log.append("# Yak Ops Offline Sync\n")
        .append("definitionId: ").append(execution.getJobDefinitionId()).append('\n')
        .append("instanceId: ").append(execution.getId()).append('\n')
        .append("engineJobId: ").append(value(execution.getEngineJobId())).append('\n')
        .append("status: ").append(value(execution.getStatus())).append('\n')
        .append("sourceRecordCount: ").append(number(execution.getSourceRecordCount())).append('\n')
        .append("sinkSuccessRecordCount: ").append(number(execution.getSinkSuccessRecordCount())).append('\n')
        .append("durationMillis: ").append(number(execution.getDurationMillis())).append('\n');
    if (StringUtils.hasText(execution.getErrorMessage())) {
      log.append("error: ").append(execution.getErrorMessage()).append('\n');
    }
    if (StringUtils.hasText(execution.getEngineSnapshotJson())) {
      log.append("\n# Link-Up Snapshot\n").append(execution.getEngineSnapshotJson()).append('\n');
    }
    return log.toString();
  }

  public Map<String, Object> page(JsonNode request) {
    int current = Math.max(1, request == null ? 1 : request.path("current").asInt(1));
    int pageSize = Math.min(200, Math.max(1, request == null ? 10 : request.path("pageSize").asInt(10)));
    LambdaQueryWrapper<OfflineJobExecutionPO> query = new LambdaQueryWrapper<>();
    if (request != null) {
      long definitionId = request.path("jobDefinitionId").asLong(0L);
      if (definitionId > 0L) {
        query.eq(OfflineJobExecutionPO::getJobDefinitionId, definitionId);
      }
      String status = request.path("status").asText(null);
      if (StringUtils.hasText(status)) {
        query.eq(OfflineJobExecutionPO::getStatus, status.toUpperCase());
      }
    }
    query.orderByDesc(OfflineJobExecutionPO::getId);
    Page<OfflineJobExecutionPO> page = executionMapper.selectPage(new Page<>(current, pageSize), query);
    List<Map<String, Object>> records = new ArrayList<>();
    for (OfflineJobExecutionPO execution : page.getRecords()) {
      synchronizer.refreshExecution(execution);
      records.add(toView(execution));
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

  private Map<String, Object> batch(JsonNode request, boolean execute) {
    JsonNode ids = request == null ? null : request.path("jobDefinitionIds");
    if (ids == null || !ids.isArray() || ids.isEmpty()) {
      throw new IllegalArgumentException("jobDefinitionIds 不能为空");
    }
    int successCount = 0;
    List<Map<String, Object>> errors = new ArrayList<>();
    for (JsonNode idNode : ids) {
      long definitionId = idNode.asLong(0L);
      try {
        if (definitionId <= 0L) {
          throw new IllegalArgumentException("任务定义 ID 不合法");
        }
        if (execute) {
          execute(definitionId);
        } else {
          cancelLatest(definitionId);
        }
        successCount++;
      } catch (RuntimeException exception) {
        Map<String, Object> error = new LinkedHashMap<>();
        error.put("jobDefinitionId", definitionId);
        error.put("message", exception.getMessage());
        errors.add(error);
      }
    }
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("successCount", successCount);
    result.put("failedCount", errors.size());
    result.put("errors", errors);
    return result;
  }

  private OfflineJobExecutionPO require(Long executionId) {
    if (executionId == null || executionId <= 0L) {
      throw new IllegalArgumentException("任务实例 ID 不合法");
    }
    OfflineJobExecutionPO execution = executionMapper.selectById(executionId);
    if (execution == null) {
      throw new IllegalArgumentException("离线同步任务实例不存在：" + executionId);
    }
    return execution;
  }

  private void fail(
      OfflineJobDefinitionPO definition,
      OfflineJobExecutionPO execution,
      String message) {
    LocalDateTime now = LocalDateTime.now();
    execution.setStatus("FAILED");
    execution.setErrorMessage(message);
    execution.setEndTime(now);
    execution.setUpdateTime(now);
    executionMapper.updateById(execution);
    definition.setLastJobStatus("FAILED");
    definition.setLastErrorMessage(message);
    definition.setLastEndTime(now);
    definition.setUpdateTime(now);
    definitionMapper.updateById(definition);
  }

  private Map<String, Object> toView(OfflineJobExecutionPO execution) {
    Map<String, Object> view = new LinkedHashMap<>();
    view.put("id", execution.getId());
    view.put("jobDefinitionId", execution.getJobDefinitionId());
    view.put("engineJobId", execution.getEngineJobId());
    view.put("status", execution.getStatus());
    view.put("errorMessage", execution.getErrorMessage());
    view.put("sourceRecordCount", number(execution.getSourceRecordCount()));
    view.put("sinkSuccessRecordCount", number(execution.getSinkSuccessRecordCount()));
    view.put("sourceReadBytes", number(execution.getSourceReadBytes()));
    view.put("sinkWrittenBytes", number(execution.getSinkWrittenBytes()));
    view.put("qps", execution.getQps() == null ? 0D : execution.getQps());
    view.put("durationMillis", number(execution.getDurationMillis()));
    view.put("createTime", format(execution.getCreateTime()));
    view.put("startTime", format(execution.getStartTime()));
    view.put("endTime", format(execution.getEndTime()));
    view.put("updateTime", format(execution.getUpdateTime()));
    return view;
  }

  private long number(Long value) {
    return value == null ? 0L : value;
  }

  private String value(String value) {
    return StringUtils.hasText(value) ? value : "-";
  }

  private String format(LocalDateTime value) {
    return value == null ? null : value.format(DATE_TIME_FORMATTER);
  }
}
