package io.yak.ops.business.sync.offline.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.dao.OfflineJobDefinitionDao;
import io.yak.ops.business.sync.offline.dao.OfflineJobExecutionDao;
import io.yak.ops.business.sync.offline.engine.LinkUpClient;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobDefinitionPO;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobExecutionPO;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Set;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/** 将 Link-Up 作业快照同步回 Yak Ops 任务定义与执行记录。 */
@ConditionalOnOfflineSyncEnabled
@Component
public class OfflineExecutionSynchronizer {

  private static final Set<String> ACTIVE_STATUSES = Set.of(
      "SUBMITTED",
      "INITIALIZING",
      "CREATED",
      "PENDING",
      "SCHEDULED",
      "RUNNING",
      "CANCELING");

  private final LinkUpClient linkUpClient;
  private final OfflineJobDefinitionDao definitionDao;
  private final OfflineJobExecutionDao executionDao;
  private final ObjectMapper objectMapper;

  public OfflineExecutionSynchronizer(
      LinkUpClient linkUpClient,
      OfflineJobDefinitionDao definitionDao,
      OfflineJobExecutionDao executionDao,
      @Qualifier("offlineSyncJsonMapper") ObjectMapper objectMapper) {
    this.linkUpClient = linkUpClient;
    this.definitionDao = definitionDao;
    this.executionDao = executionDao;
    this.objectMapper = objectMapper;
  }

  public OfflineJobDefinitionPO refreshDefinition(OfflineJobDefinitionPO definition) {
    if (definition == null
        || !StringUtils.hasText(definition.getLastEngineJobId())
        || !isActive(definition.getLastJobStatus())) {
      return definition;
    }
    try {
      JsonNode snapshot = linkUpClient.getJob(definition.getLastEngineJobId());
      OfflineJobExecutionPO execution = definition.getLastExecutionId() == null
          ? null
          : executionDao.selectById(definition.getLastExecutionId());
      apply(definition, execution, snapshot);
    } catch (RuntimeException exception) {
      definition.setLastErrorMessage(exception.getMessage());
      definition.setUpdateTime(LocalDateTime.now());
      definitionDao.updateById(definition);
    }
    return definition;
  }

  public OfflineJobExecutionPO refreshExecution(OfflineJobExecutionPO execution) {
    if (execution == null
        || !StringUtils.hasText(execution.getEngineJobId())
        || !isActive(execution.getStatus())) {
      return execution;
    }
    JsonNode snapshot = linkUpClient.getJob(execution.getEngineJobId());
    OfflineJobDefinitionPO definition = definitionDao.selectById(execution.getJobDefinitionId());
    apply(definition, execution, snapshot);
    return execution;
  }

  public void apply(
      OfflineJobDefinitionPO definition,
      OfflineJobExecutionPO execution,
      JsonNode snapshot) {
    LocalDateTime now = LocalDateTime.now();
    String status = normalizeStatus(snapshot.path("status").asText("UNKNOWN"));
    JsonNode metrics = snapshot.path("metrics");
    long sourceCount = number(metrics, "sourceRecordCount", number(snapshot, "sourceRecordCount", 0L));
    long sinkCount = number(metrics, "sinkSuccessRecordCount", number(snapshot, "sinkSuccessRecordCount", 0L));
    long sourceBytes = number(metrics, "sourceReadBytes", 0L);
    long sinkBytes = number(metrics, "sinkWrittenBytes", 0L);
    long durationMillis = number(snapshot, "durationMillis", 0L);
    double qps = decimal(metrics, "sourceAverageQps", 0D);
    if (qps <= 0D) {
      qps = decimal(metrics, "sinkAverageQps", 0D);
    }
    String errorMessage = snapshot.path("errorMessage").asText(null);
    LocalDateTime startTime = time(number(snapshot, "startTimeMillis", 0L));
    LocalDateTime endTime = time(number(snapshot, "endTimeMillis", 0L));

    if (execution != null) {
      execution.setStatus(status);
      execution.setEngineSnapshotJson(write(snapshot));
      execution.setErrorMessage(errorMessage);
      execution.setSourceRecordCount(sourceCount);
      execution.setSinkSuccessRecordCount(sinkCount);
      execution.setSourceReadBytes(sourceBytes);
      execution.setSinkWrittenBytes(sinkBytes);
      execution.setQps(qps);
      execution.setDurationMillis(durationMillis);
      execution.setStartTime(startTime);
      execution.setEndTime(endTime);
      execution.setUpdateTime(now);
      executionDao.updateById(execution);
    }

    if (definition != null) {
      definition.setLastJobStatus(status);
      definition.setLastErrorMessage(errorMessage);
      definition.setLastDurationMillis(durationMillis);
      definition.setLastReadRowCount(sourceCount);
      definition.setLastQps(qps);
      definition.setLastSyncBytes(Math.max(sourceBytes, sinkBytes));
      definition.setLastStartTime(startTime);
      definition.setLastEndTime(endTime);
      definition.setUpdateTime(now);
      definitionDao.updateById(definition);
    }
  }

  public boolean isActive(String status) {
    return status != null && ACTIVE_STATUSES.contains(status.toUpperCase());
  }

  private String normalizeStatus(String status) {
    String normalized = status == null ? "UNKNOWN" : status.toUpperCase();
    if ("SUCCEEDED".equals(normalized)) {
      return "FINISHED";
    }
    if ("SUBMITTED".equals(normalized) || "CANCELLING".equals(normalized)) {
      return "RUNNING";
    }
    return normalized;
  }

  private long number(JsonNode node, String field, long fallback) {
    JsonNode value = node == null ? null : node.get(field);
    return value == null || !value.isNumber() ? fallback : value.asLong(fallback);
  }

  private double decimal(JsonNode node, String field, double fallback) {
    JsonNode value = node == null ? null : node.get(field);
    return value == null || !value.isNumber() ? fallback : value.asDouble(fallback);
  }

  private LocalDateTime time(long millis) {
    return millis <= 0L
        ? null
        : LocalDateTime.ofInstant(Instant.ofEpochMilli(millis), ZoneId.systemDefault());
  }

  private String write(JsonNode value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("序列化 Link-Up 作业快照失败", exception);
    }
  }
}
