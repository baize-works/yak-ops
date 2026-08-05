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
import io.yak.ops.business.sync.offline.engine.LinkUpClient.LinkUpTransportException;
import io.yak.ops.business.sync.offline.repository.OfflineExecutionControlRepository;
import io.yak.ops.business.sync.offline.repository.OfflineScheduleRepository;
import io.yak.ops.business.sync.offline.repository.OfflineScheduleRepository.ScheduleRecord;
import io.yak.ops.business.sync.offline.service.OfflineExecutionClaimService.ClaimResult;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobDefinitionPO;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobExecutionPO;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/** 离线任务提交、取消和状态落库。 */
@ConditionalOnOfflineSyncEnabled
@Component
public class OfflineExecutionOrchestrator {
  private final OfflineJobDefinitionService definitionService;
  private final OfflineExecutionClaimService claimService;
  private final OfflineJobDefinitionDao definitionDao;
  private final OfflineJobExecutionDao executionDao;
  private final OfflineExecutionControlRepository executionRepository;
  private final OfflineScheduleRepository scheduleRepository;
  private final LinkUpClient linkUpClient;
  private final OfflineSyncProperties properties;
  private final ObjectMapper objectMapper;

  public OfflineExecutionOrchestrator(
      OfflineJobDefinitionService definitionService,
      OfflineExecutionClaimService claimService,
      OfflineJobDefinitionDao definitionDao,
      OfflineJobExecutionDao executionDao,
      OfflineExecutionControlRepository executionRepository,
      OfflineScheduleRepository scheduleRepository,
      LinkUpClient linkUpClient,
      OfflineSyncProperties properties,
      @Qualifier("offlineSyncJsonMapper") ObjectMapper objectMapper) {
    this.definitionService = definitionService;
    this.claimService = claimService;
    this.definitionDao = definitionDao;
    this.executionDao = executionDao;
    this.executionRepository = executionRepository;
    this.scheduleRepository = scheduleRepository;
    this.linkUpClient = linkUpClient;
    this.properties = properties;
    this.objectMapper = objectMapper;
  }

  public OfflineJobExecutionPO execute(
      Long definitionId,
      String triggerType,
      Long retryFromExecutionId,
      int attemptNo) {
    ClaimResult claim =
        claimService.claim(definitionId, triggerType, retryFromExecutionId, attemptNo);
    OfflineJobExecutionPO execution = claim.getExecution();
    record(
        execution,
        null,
        execution.getStatus(),
        "EXECUTION_CREATED",
        "使用 application.yml 中的固定 Link-Up 地址",
        null);
    try {
      String resolved = definitionService.resolveExecutionJobSpec(claim.getDefinition());
      JsonNode jobSpec = readJobSpec(resolved);
      transition(
          execution,
          OfflineExecutionStatus.SUBMITTED,
          "SUBMITTING",
          "正在向 Link-Up 提交 JobSpec",
          null);
      LinkUpJobResponse response =
          linkUpClient.submit(
              execution.getExternalExecutionId(),
              execution.getIdempotencyKey(),
              execution.getDefinitionVersion(),
              jobSpec);
      applySnapshot(execution, response, "SUBMITTED");
      return execution;
    } catch (LinkUpRequestException e) {
      markTerminal(
          execution,
          OfflineExecutionStatus.FAILED,
          e.getCode() + "：" + e.getMessage(),
          null,
          e.getStatusCode() == 429 || e.getStatusCode() >= 500);
      throw e;
    } catch (LinkUpTransportException e) {
      if (e.isUncertain()) {
        execution.setErrorMessage(e.getMessage());
        execution.setLastSyncTime(LocalDateTime.now());
        execution.setUpdateTime(LocalDateTime.now());
        executionDao.updateById(execution);
        record(
            execution,
            execution.getStatus(),
            execution.getStatus(),
            "SUBMIT_UNCERTAIN",
            e.getMessage(),
            null);
        return execution;
      }
      markTerminal(
          execution,
          OfflineExecutionStatus.FAILED,
          e.getMessage(),
          null,
          true);
      throw e;
    } catch (RuntimeException e) {
      markTerminal(
          execution,
          OfflineExecutionStatus.FAILED,
          e.getMessage(),
          null,
          false);
      throw e;
    }
  }

  public OfflineJobExecutionPO retryFrom(OfflineJobExecutionPO previous) {
    if (previous == null || previous.getId() == null) {
      throw new IllegalArgumentException("重试来源实例不能为空");
    }
    return execute(
        previous.getJobDefinitionId(),
        "RETRY",
        previous.getId(),
        value(previous.getAttemptNo(), 1) + 1);
  }

  public OfflineJobExecutionPO cancel(Long id) {
    OfflineJobExecutionPO execution = require(id);
    if (!OfflineExecutionStatus.isActive(execution.getStatus())) {
      throw new IllegalStateException("当前执行实例已结束，无需停止");
    }
    execution.setCancellationRequested(true);
    execution.setUpdateTime(LocalDateTime.now());
    executionDao.updateById(execution);
    record(
        execution,
        execution.getStatus(),
        execution.getStatus(),
        "CANCEL_REQUESTED",
        "Yak Ops 已记录取消意图",
        null);
    if (StringUtils.hasText(execution.getEngineJobId())) {
      applySnapshot(
          execution,
          linkUpClient.cancel(execution.getEngineJobId()),
          "CANCEL_ACCEPTED");
    }
    return execution;
  }

  public void applySnapshot(
      OfflineJobExecutionPO execution,
      LinkUpJobResponse response,
      String eventType) {
    if (execution == null || response == null) {
      return;
    }

    String previous = execution.getStatus();
    OfflineExecutionStatus next =
        StringUtils.hasText(response.getStatus())
            ? OfflineExecutionStatus.parse(response.getStatus())
            : OfflineExecutionStatus.parse(execution.getStatus());

    execution.setEngineJobId(first(response.getJobId(), execution.getEngineJobId()));
    execution.setWorkerInstanceId(
        first(response.getWorkerInstanceId(), execution.getWorkerInstanceId()));
    execution.setStatus(next.name());
    execution.setStateVersion(
        Math.max(
            value(execution.getStateVersion(), 0L),
            value(response.getStateVersion(), 0L)));
    execution.setCancellationRequested(
        Boolean.TRUE.equals(response.getCancellationRequested())
            || Boolean.TRUE.equals(execution.getCancellationRequested()));
    execution.setEngineSnapshotJson(write(response));
    execution.setErrorMessage(response.getErrorMessage());

    applyMetrics(execution, response);

    execution.setDurationMillis(value(response.getDurationMillis(), 0L));
    execution.setStartTime(time(response.getStartTimeMillis()));
    execution.setEndTime(time(response.getEndTimeMillis()));
    execution.setLastSyncTime(LocalDateTime.now());
    execution.setUpdateTime(LocalDateTime.now());
    configureRetry(execution, next, retryable(response, next));
    executionDao.updateById(execution);
    updateDefinition(execution, next);

    if (!next.name().equals(previous)) {
      record(
          execution,
          previous,
          next.name(),
          eventType,
          response.getErrorMessage(),
          execution.getEngineSnapshotJson());
    }
  }

  private void applyMetrics(
      OfflineJobExecutionPO execution,
      LinkUpJobResponse response) {
    JsonNode metrics = response.getMetrics();
    JsonNode commitSummary = response.getCommitSummary();

    long sourceRecordCount = number(metrics, "sourceRecordCount", 0L);
    long sinkAttemptedRecordCount =
        number(metrics, "sinkAttemptedRecordCount", 0L);
    long sinkSuccessRecordCount =
        number(metrics, "sinkSuccessRecordCount", 0L);
    long sinkCommittedRecordCount =
        number(
            commitSummary,
            "successfullyCommittedRecordCount",
            sinkSuccessRecordCount);
    double sourceAverageQps = decimal(metrics, "sourceAverageQps", 0D);
    double sinkAverageQps = decimal(metrics, "sinkAverageQps", 0D);

    execution.setSourceRecordCount(sourceRecordCount);
    execution.setSinkAttemptedRecordCount(sinkAttemptedRecordCount);
    execution.setSinkSuccessRecordCount(sinkSuccessRecordCount);
    execution.setSinkCommittedRecordCount(sinkCommittedRecordCount);
    execution.setSourceReadBytes(number(metrics, "sourceReadBytes", 0L));
    execution.setSinkWrittenBytes(number(metrics, "sinkWrittenBytes", 0L));
    execution.setSourceAverageQps(sourceAverageQps);
    execution.setSinkAverageQps(sinkAverageQps);
    execution.setFailedRecordCount(number(metrics, "failedRecordCount", 0L));
    execution.setSkippedRecordCount(number(metrics, "skippedRecordCount", 0L));
    execution.setDatabaseCommitMillis(number(metrics, "databaseCommitMillis", 0L));
    execution.setSqlExecutionMillis(number(metrics, "sqlExecutionMillis", 0L));

    // 保留 qps 字段兼容已有列表和接口；独立的读写 QPS 使用上面的两个字段。
    execution.setQps(
        sourceAverageQps > 0D
            ? sourceAverageQps
            : sinkAverageQps);
  }

  public void markLost(OfflineJobExecutionPO execution, String message) {
    if (execution != null
        && OfflineExecutionStatus.isActive(execution.getStatus())) {
      markTerminal(
          execution,
          OfflineExecutionStatus.LOST,
          message,
          null,
          true);
    }
  }

  public OfflineJobExecutionPO require(Long id) {
    if (id == null || id <= 0L) {
      throw new IllegalArgumentException("任务实例 ID 不合法");
    }
    OfflineJobExecutionPO execution = executionDao.selectById(id);
    if (execution == null) {
      throw new IllegalArgumentException("离线同步任务实例不存在：" + id);
    }
    return execution;
  }

  private void markTerminal(
      OfflineJobExecutionPO execution,
      OfflineExecutionStatus status,
      String message,
      String payload,
      boolean retryable) {
    String previous = execution.getStatus();
    execution.setStatus(status.name());
    execution.setStateVersion(value(execution.getStateVersion(), 0L) + 1L);
    execution.setErrorMessage(message);
    execution.setEndTime(LocalDateTime.now());
    execution.setLastSyncTime(LocalDateTime.now());
    execution.setUpdateTime(LocalDateTime.now());
    configureRetry(execution, status, retryable);
    executionDao.updateById(execution);
    updateDefinition(execution, status);
    record(
        execution,
        previous,
        status.name(),
        status.name(),
        message,
        payload);
  }

  private void updateDefinition(
      OfflineJobExecutionPO execution,
      OfflineExecutionStatus status) {
    OfflineJobDefinitionPO definition =
        definitionDao.selectById(execution.getJobDefinitionId());
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
    definition.setLastSyncBytes(
        Math.max(
            value(execution.getSourceReadBytes(), 0L),
            value(execution.getSinkWrittenBytes(), 0L)));
    definition.setLastStartTime(execution.getStartTime());
    definition.setLastEndTime(execution.getEndTime());
    definition.setUpdateTime(LocalDateTime.now());
    definitionDao.updateById(definition);
  }

  private void transition(
      OfflineJobExecutionPO execution,
      OfflineExecutionStatus target,
      String type,
      String message,
      String payload) {
    String previous = execution.getStatus();
    execution.setStatus(target.name());
    execution.setStateVersion(value(execution.getStateVersion(), 0L) + 1L);
    execution.setUpdateTime(LocalDateTime.now());
    executionDao.updateById(execution);
    record(
        execution,
        previous,
        target.name(),
        type,
        message,
        payload);
  }

  private void configureRetry(
      OfflineJobExecutionPO execution,
      OfflineExecutionStatus status,
      boolean retryable) {
    execution.setNextRetryTime(null);
    if (!retryable
        || (status != OfflineExecutionStatus.FAILED
            && status != OfflineExecutionStatus.LOST)) {
      return;
    }
    ScheduleRecord schedule =
        scheduleRepository.findSchedule(execution.getJobDefinitionId());
    int attempts =
        schedule == null
            ? properties.getControl().getDefaultMaxAttempts()
            : schedule.getRetryMaxAttempts();
    int backoff =
        schedule == null
            ? properties.getControl().getDefaultRetryBackoffSeconds()
            : schedule.getRetryBackoffSeconds();
    if (value(execution.getAttemptNo(), 1) < Math.max(1, attempts)) {
      execution.setNextRetryTime(
          LocalDateTime.now().plusSeconds(Math.max(1, backoff)));
    }
  }

  private boolean retryable(
      LinkUpJobResponse response,
      OfflineExecutionStatus status) {
    if (status == OfflineExecutionStatus.LOST) {
      return true;
    }
    if (status != OfflineExecutionStatus.FAILED) {
      return false;
    }
    String code = response == null ? null : response.getErrorCode();
    if (!StringUtils.hasText(code)) {
      return true;
    }
    String normalized = code.toUpperCase(java.util.Locale.ROOT);
    return !(normalized.contains("CONFIG")
        || normalized.contains("VALIDATION")
        || normalized.contains("IDEMPOTENCY")
        || normalized.contains("BAD_REQUEST")
        || normalized.contains("UNSUPPORTED"));
  }

  private JsonNode readJobSpec(String value) {
    if (!StringUtils.hasText(value)) {
      throw new IllegalStateException("任务缺少 Link-Up JobSpec");
    }
    try {
      JsonNode node = objectMapper.readTree(value);
      if (node == null || !node.isObject()) {
        throw new IllegalStateException("Link-Up JobSpec 不是 JSON 对象");
      }
      return node;
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("Link-Up JobSpec 已损坏", exception);
    }
  }

  private void record(
      OfflineJobExecutionPO execution,
      String from,
      String to,
      String type,
      String message,
      String payload) {
    executionRepository.recordExecutionEvent(
        execution.getId(),
        value(execution.getStateVersion(), 0L),
        from,
        to,
        type,
        message,
        payload);
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
    return value == null || !value.isNumber()
        ? fallback
        : value.asLong(fallback);
  }

  private double decimal(JsonNode node, String field, double fallback) {
    JsonNode value = node == null ? null : node.get(field);
    return value == null || !value.isNumber()
        ? fallback
        : value.asDouble(fallback);
  }

  private LocalDateTime time(Long millis) {
    return millis == null || millis <= 0L
        ? null
        : LocalDateTime.ofInstant(
            Instant.ofEpochMilli(millis),
            ZoneId.systemDefault());
  }

  private String first(String value, String fallback) {
    return StringUtils.hasText(value) ? value : fallback;
  }

  private int value(Integer value, int fallback) {
    return value == null ? fallback : value;
  }

  private long value(Long value, long fallback) {
    return value == null ? fallback : value;
  }
}
