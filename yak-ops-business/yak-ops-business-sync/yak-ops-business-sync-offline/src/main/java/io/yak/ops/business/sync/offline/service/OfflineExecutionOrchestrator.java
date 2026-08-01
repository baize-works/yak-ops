package io.yak.ops.business.sync.offline.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.config.OfflineSyncProperties;
import io.yak.ops.business.sync.offline.dao.OfflineJobDefinitionDao;
import io.yak.ops.business.sync.offline.dao.OfflineJobExecutionDao;
import io.yak.ops.business.sync.offline.domain.OfflineExecutionStatus;
import io.yak.ops.business.sync.offline.engine.LinkUpClient;
import io.yak.ops.business.sync.offline.engine.LinkUpClient.LinkUpJobResponse;
import io.yak.ops.business.sync.offline.engine.LinkUpClient.LinkUpRequestException;
import io.yak.ops.business.sync.offline.repository.OfflineDefinitionCatalogRepository.DefinitionVersion;
import io.yak.ops.business.sync.offline.repository.OfflineExecutionControlRepository;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository.NodeRecord;
import io.yak.ops.business.sync.offline.repository.OfflineScheduleRepository;
import io.yak.ops.business.sync.offline.repository.OfflineScheduleRepository.ScheduleRecord;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobDefinitionPO;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobExecutionPO;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/** 离线任务命令编排和状态持久化。 */
@ConditionalOnOfflineSyncEnabled
@Component
public class OfflineExecutionOrchestrator {

  private final OfflineJobDefinitionService definitionService;
  private final OfflineJobDefinitionDao definitionDao;
  private final OfflineJobExecutionDao executionDao;
  private final OfflineExecutionControlRepository executionRepository;
  private final OfflineScheduleRepository scheduleRepository;
  private final OfflineWorkerRegistry workerRegistry;
  private final OfflineAlertPublisher alertPublisher;
  private final LinkUpClient linkUpClient;
  private final OfflineSyncProperties properties;
  private final ObjectMapper objectMapper;

  public OfflineExecutionOrchestrator(
      OfflineJobDefinitionService definitionService,
      OfflineJobDefinitionDao definitionDao,
      OfflineJobExecutionDao executionDao,
      OfflineExecutionControlRepository executionRepository,
      OfflineScheduleRepository scheduleRepository,
      OfflineWorkerRegistry workerRegistry,
      OfflineAlertPublisher alertPublisher,
      LinkUpClient linkUpClient,
      OfflineSyncProperties properties,
      @Qualifier("offlineSyncJsonMapper") ObjectMapper objectMapper) {
    this.definitionService = definitionService;
    this.definitionDao = definitionDao;
    this.executionDao = executionDao;
    this.executionRepository = executionRepository;
    this.scheduleRepository = scheduleRepository;
    this.workerRegistry = workerRegistry;
    this.alertPublisher = alertPublisher;
    this.linkUpClient = linkUpClient;
    this.properties = properties;
    this.objectMapper = objectMapper;
  }

  public OfflineJobExecutionPO execute(
      Long definitionId, String triggerType, Long retryFromExecutionId, int attemptNo) {
    OfflineJobDefinitionPO definition = definitionService.require(definitionId);
    if (!"ONLINE".equalsIgnoreCase(definition.getReleaseState())) {
      throw new IllegalStateException("请先上线任务，再执行运行操作");
    }
    if (executionRepository.hasActiveExecution(definitionId)) {
      throw new IllegalStateException("任务已有运行中的执行实例，不能重复提交");
    }
    DefinitionVersion version = definitionService.requireCurrentVersion(definition);
    NodeRecord node = workerRegistry.selectNode();

    LocalDateTime now = LocalDateTime.now();
    OfflineJobExecutionPO execution = new OfflineJobExecutionPO();
    execution.setJobDefinitionId(definitionId);
    execution.setDefinitionVersionId(version.getId());
    execution.setDefinitionVersion(version.getVersionNo());
    execution.setEngineNodeId(node.getNodeId());
    execution.setWorkerInstanceId(node.getWorkerInstanceId());
    execution.setStatus(OfflineExecutionStatus.CREATED.name());
    execution.setStateVersion(1L);
    execution.setAttemptNo(Math.max(1, attemptNo));
    execution.setTriggerType(triggerType);
    execution.setRetryFromExecutionId(retryFromExecutionId);
    execution.setCancellationRequested(false);
    execution.setRetryCreated(false);
    execution.setConfigDigest(version.getConfigDigest());
    execution.setSubmittedConfig(version.getHoconConfig());
    execution.setSourceRecordCount(0L);
    execution.setSinkSuccessRecordCount(0L);
    execution.setSourceReadBytes(0L);
    execution.setSinkWrittenBytes(0L);
    execution.setQps(0D);
    execution.setDurationMillis(0L);
    execution.setCreateTime(now);
    execution.setUpdateTime(now);
    executionDao.insert(execution);

    execution.setExternalExecutionId("yak-offline-execution-" + execution.getId());
    execution.setIdempotencyKey(UUID.randomUUID().toString());
    executionDao.updateById(execution);
    record(execution, null, execution.getStatus(), "CREATED", "Yak Ops 已创建执行实例", null);

    try {
      transition(execution, OfflineExecutionStatus.SUBMITTED, "SUBMITTING", "正在提交 Link-Up", null);
      LinkUpJobResponse response = linkUpClient.submit(
          execution.getExternalExecutionId(), execution.getIdempotencyKey(),
          version.getVersionNo(), version.getHoconConfig());
      applySnapshot(execution, response, "SUBMITTED");
      return execution;
    } catch (LinkUpRequestException exception) {
      markTerminal(execution, OfflineExecutionStatus.FAILED,
          exception.getCode() + "：" + exception.getMessage(), null);
      throw exception;
    } catch (RuntimeException exception) {
      // 网络中断时不能断言 Link-Up 未接收，保留 SUBMITTED 交给 externalExecutionId 对账。
      execution.setErrorMessage(exception.getMessage());
      execution.setLastSyncTime(LocalDateTime.now());
      execution.setUpdateTime(LocalDateTime.now());
      executionDao.updateById(execution);
      record(execution, execution.getStatus(), execution.getStatus(),
          "SUBMIT_UNCERTAIN", exception.getMessage(), null);
      return execution;
    }
  }

  public OfflineJobExecutionPO retryFrom(OfflineJobExecutionPO previous) {
    if (previous == null || previous.getId() == null) {
      throw new IllegalArgumentException("重试来源实例不能为空");
    }
    return execute(previous.getJobDefinitionId(), "RETRY", previous.getId(),
        value(previous.getAttemptNo(), 1) + 1);
  }

  public OfflineJobExecutionPO cancel(Long executionId) {
    OfflineJobExecutionPO execution = require(executionId);
    if (!OfflineExecutionStatus.isActive(execution.getStatus())) {
      throw new IllegalStateException("当前执行实例已结束，无需停止");
    }
    execution.setCancellationRequested(true);
    execution.setUpdateTime(LocalDateTime.now());
    executionDao.updateById(execution);
    record(execution, execution.getStatus(), execution.getStatus(),
        "CANCEL_REQUESTED", "Yak Ops 已记录取消意图", null);
    if (StringUtils.hasText(execution.getEngineJobId())) {
      applySnapshot(execution, linkUpClient.cancel(execution.getEngineJobId()), "CANCEL_ACCEPTED");
    }
    return execution;
  }

  public void applySnapshot(
      OfflineJobExecutionPO execution, LinkUpJobResponse response, String eventType) {
    if (execution == null || response == null) {
      return;
    }
    String previousStatus = execution.getStatus();
    OfflineExecutionStatus nextStatus = StringUtils.hasText(response.getStatus())
        ? OfflineExecutionStatus.parse(response.getStatus())
        : OfflineExecutionStatus.parse(execution.getStatus());
    execution.setEngineJobId(first(response.getJobId(), execution.getEngineJobId()));
    execution.setWorkerInstanceId(first(response.getWorkerInstanceId(), execution.getWorkerInstanceId()));
    execution.setStatus(nextStatus.name());
    execution.setStateVersion(Math.max(value(execution.getStateVersion(), 0L),
        value(response.getStateVersion(), 0L)));
    execution.setCancellationRequested(Boolean.TRUE.equals(response.getCancellationRequested())
        || Boolean.TRUE.equals(execution.getCancellationRequested()));
    execution.setEngineSnapshotJson(write(response));
    execution.setErrorMessage(response.getErrorMessage());
    JsonNode metrics = response.getMetrics();
    execution.setSourceRecordCount(number(metrics, "sourceRecordCount", 0L));
    execution.setSinkSuccessRecordCount(number(metrics, "sinkSuccessRecordCount", 0L));
    execution.setSourceReadBytes(number(metrics, "sourceReadBytes", 0L));
    execution.setSinkWrittenBytes(number(metrics, "sinkWrittenBytes", 0L));
    execution.setQps(decimal(metrics, "sourceAverageQps",
        decimal(metrics, "sinkAverageQps", 0D)));
    execution.setDurationMillis(value(response.getDurationMillis(), 0L));
    execution.setStartTime(time(response.getStartTimeMillis()));
    execution.setEndTime(time(response.getEndTimeMillis()));
    execution.setLastSyncTime(LocalDateTime.now());
    execution.setUpdateTime(LocalDateTime.now());
    configureRetry(execution, nextStatus);
    executionDao.updateById(execution);
    updateDefinition(execution, nextStatus);
    if (!nextStatus.name().equals(previousStatus)) {
      record(execution, previousStatus, nextStatus.name(), eventType,
          response.getErrorMessage(), execution.getEngineSnapshotJson());
    }
    publishAlert(execution, nextStatus);
  }

  public void markLost(OfflineJobExecutionPO execution, String message) {
    if (execution != null && OfflineExecutionStatus.isActive(execution.getStatus())) {
      markTerminal(execution, OfflineExecutionStatus.LOST, message, null);
    }
  }

  public OfflineJobExecutionPO require(Long executionId) {
    if (executionId == null || executionId <= 0L) {
      throw new IllegalArgumentException("任务实例 ID 不合法");
    }
    OfflineJobExecutionPO execution = executionDao.selectById(executionId);
    if (execution == null) {
      throw new IllegalArgumentException("离线同步任务实例不存在：" + executionId);
    }
    return execution;
  }

  private void markTerminal(
      OfflineJobExecutionPO execution, OfflineExecutionStatus status, String message, String payload) {
    String previousStatus = execution.getStatus();
    execution.setStatus(status.name());
    execution.setStateVersion(value(execution.getStateVersion(), 0L) + 1L);
    execution.setErrorMessage(message);
    execution.setEndTime(LocalDateTime.now());
    execution.setLastSyncTime(LocalDateTime.now());
    execution.setUpdateTime(LocalDateTime.now());
    configureRetry(execution, status);
    executionDao.updateById(execution);
    updateDefinition(execution, status);
    record(execution, previousStatus, status.name(), status.name(), message, payload);
    publishAlert(execution, status);
  }

  private void updateDefinition(OfflineJobExecutionPO execution, OfflineExecutionStatus status) {
    OfflineJobDefinitionPO definition = definitionDao.selectById(execution.getJobDefinitionId());
    if (definition == null) {
      return;
    }
    definition.setLastExecutionId(execution.getId());
    definition.setLastEngineJobId(execution.getEngineJobId());
    definition.setLastJobStatus(status.name());
    definition.setLastErrorMessage(execution.getErrorMessage());
    definition.setLastDurationMillis(execution.getDurationMillis());
    definition.setLastReadRowCount(execution.getSourceRecordCount());
    definition.setLastQps(execution.getQps());
    definition.setLastSyncBytes(Math.max(value(execution.getSourceReadBytes(), 0L),
        value(execution.getSinkWrittenBytes(), 0L)));
    definition.setLastStartTime(execution.getStartTime());
    definition.setLastEndTime(execution.getEndTime());
    definition.setUpdateTime(LocalDateTime.now());
    definitionDao.updateById(definition);
  }

  private void transition(OfflineJobExecutionPO execution, OfflineExecutionStatus target,
      String eventType, String message, String payload) {
    String previous = execution.getStatus();
    execution.setStatus(target.name());
    execution.setStateVersion(value(execution.getStateVersion(), 0L) + 1L);
    execution.setUpdateTime(LocalDateTime.now());
    executionDao.updateById(execution);
    record(execution, previous, target.name(), eventType, message, payload);
  }

  private void configureRetry(OfflineJobExecutionPO execution, OfflineExecutionStatus status) {
    execution.setNextRetryTime(null);
    if (status != OfflineExecutionStatus.FAILED && status != OfflineExecutionStatus.LOST) {
      return;
    }
    ScheduleRecord schedule = scheduleRepository.findSchedule(execution.getJobDefinitionId());
    int maxAttempts = schedule == null
        ? properties.getControl().getDefaultMaxAttempts() : schedule.getRetryMaxAttempts();
    int backoff = schedule == null
        ? properties.getControl().getDefaultRetryBackoffSeconds()
        : schedule.getRetryBackoffSeconds();
    if (value(execution.getAttemptNo(), 1) < Math.max(1, maxAttempts)) {
      execution.setNextRetryTime(LocalDateTime.now().plusSeconds(Math.max(1, backoff)));
    }
  }

  private void record(OfflineJobExecutionPO execution, String from, String to,
      String type, String message, String payload) {
    executionRepository.recordExecutionEvent(
        execution.getId(), value(execution.getStateVersion(), 0L), from, to, type, message, payload);
  }

  private void publishAlert(OfflineJobExecutionPO execution, OfflineExecutionStatus status) {
    if (status == OfflineExecutionStatus.FAILED && properties.getControl().isAlertOnFailed()) {
      alertPublisher.publish(execution, "FAILED", text(execution.getErrorMessage()));
    }
    if (status == OfflineExecutionStatus.LOST && properties.getControl().isAlertOnLost()) {
      alertPublisher.publish(execution, "LOST", text(execution.getErrorMessage()));
    }
  }

  private String write(Object value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("序列化 Link-Up 执行快照失败", exception);
    }
  }

  private long number(JsonNode node, String field, long fallback) {
    JsonNode value = node == null ? null : node.get(field);
    return value == null || !value.isNumber() ? fallback : value.asLong(fallback);
  }

  private double decimal(JsonNode node, String field, double fallback) {
    JsonNode value = node == null ? null : node.get(field);
    return value == null || !value.isNumber() ? fallback : value.asDouble(fallback);
  }

  private LocalDateTime time(Long millis) {
    return millis == null || millis <= 0L ? null
        : LocalDateTime.ofInstant(Instant.ofEpochMilli(millis), ZoneId.systemDefault());
  }

  private String first(String value, String fallback) {
    return StringUtils.hasText(value) ? value : fallback;
  }

  private String text(String value) { return StringUtils.hasText(value) ? value : "离线任务执行失败"; }
  private int value(Integer value, int fallback) { return value == null ? fallback : value; }
  private long value(Long value, long fallback) { return value == null ? fallback : value; }
}
