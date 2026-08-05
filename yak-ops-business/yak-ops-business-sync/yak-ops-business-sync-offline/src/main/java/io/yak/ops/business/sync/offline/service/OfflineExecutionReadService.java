package io.yak.ops.business.sync.offline.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.framework.common.PagingData;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.dao.OfflineJobExecutionDao;
import io.yak.ops.business.sync.offline.engine.LinkUpClient;
import io.yak.ops.business.sync.offline.repository.OfflineExecutionControlRepository;
import io.yak.ops.business.sync.offline.repository.OfflineExecutionControlRepository.ExecutionEventRecord;
import io.yak.ops.common.bean.dto.sync.offline.OfflineJobExecutionQueryDTO;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobExecutionPO;
import io.yak.ops.common.bean.vo.sync.offline.OfflineJobExecutionDetailVO;
import io.yak.ops.common.bean.vo.sync.offline.OfflineJobExecutionVO;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/** 执行实例、指标和状态事件读模型。 */
@ConditionalOnOfflineSyncEnabled
@Component
public class OfflineExecutionReadService {
  private static final DateTimeFormatter FORMAT =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

  private final OfflineJobExecutionDao executionDao;
  private final OfflineExecutionControlRepository repository;
  private final LinkUpClient linkUpClient;
  private final ObjectMapper objectMapper;

  public OfflineExecutionReadService(
      OfflineJobExecutionDao executionDao,
      OfflineExecutionControlRepository repository,
      LinkUpClient linkUpClient,
      @Qualifier("offlineSyncJsonMapper") ObjectMapper objectMapper) {
    this.executionDao = executionDao;
    this.repository = repository;
    this.linkUpClient = linkUpClient;
    this.objectMapper = objectMapper;
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

  public PagingData<OfflineJobExecutionVO> page(
      OfflineJobExecutionQueryDTO queryDTO) {
    IPage<OfflineJobExecutionPO> page = executionDao.selectPage(queryDTO);
    List<OfflineJobExecutionVO> records =
        new ArrayList<>(page.getRecords().size());
    for (OfflineJobExecutionPO execution : page.getRecords()) {
      records.add(toVO(execution));
    }
    return new PagingData<>(records, page);
  }

  public OfflineJobExecutionDetailVO detail(Long id) {
    OfflineJobExecutionPO execution = require(id);
    OfflineJobExecutionVO summary = toVO(execution);
    OfflineJobExecutionDetailVO detail =
        OfflineJobExecutionDetailVO.builder()
            .execution(summary)
            .summary(summary)
            .build();

    if (StringUtils.hasText(execution.getEngineSnapshotJson())) {
      try {
        JsonNode snapshot =
            objectMapper.readTree(execution.getEngineSnapshotJson());
        detail.setJob(snapshot);
        detail.setPipelines(snapshot.path("pipelines"));
        detail.setTasks(snapshot.path("tasks"));
        detail.setMetrics(snapshot.path("metrics"));
      } catch (Exception ignored) {
        // 历史快照损坏不影响执行实例基本信息查询。
      }
    }
    return detail;
  }

  public JsonNode tableMetrics(Long id) {
    OfflineJobExecutionPO execution = require(id);
    if (!StringUtils.hasText(execution.getEngineJobId())) {
      throw new IllegalStateException("当前执行实例尚未获得 Link-Up jobId");
    }
    JsonNode pipelines = linkUpClient.pipelines(execution.getEngineJobId());
    return OfflinePipelineMetricsMapper.flatten(objectMapper, pipelines);
  }

  public String logs(Long id) {
    OfflineJobExecutionPO execution = require(id);
    StringBuilder log = new StringBuilder("# Yak Ops Offline Sync\n");
    log.append("definitionId: ")
        .append(execution.getJobDefinitionId())
        .append('\n')
        .append("executionId: ")
        .append(execution.getId())
        .append('\n')
        .append("definitionVersion: ")
        .append(value(execution.getDefinitionVersion()))
        .append('\n')
        .append("externalExecutionId: ")
        .append(text(execution.getExternalExecutionId()))
        .append('\n')
        .append("engineBaseUrl: ")
        .append(text(execution.getEngineBaseUrl()))
        .append('\n')
        .append("workerInstanceId: ")
        .append(text(execution.getWorkerInstanceId()))
        .append('\n')
        .append("engineJobId: ")
        .append(text(execution.getEngineJobId()))
        .append('\n')
        .append("status: ")
        .append(text(execution.getStatus()))
        .append('\n')
        .append("attemptNo: ")
        .append(value(execution.getAttemptNo()))
        .append('\n')
        .append("sourceRecordCount: ")
        .append(value(execution.getSourceRecordCount()))
        .append('\n')
        .append("sinkAttemptedRecordCount: ")
        .append(value(execution.getSinkAttemptedRecordCount()))
        .append('\n')
        .append("sinkSuccessRecordCount: ")
        .append(value(execution.getSinkSuccessRecordCount()))
        .append('\n')
        .append("sinkCommittedRecordCount: ")
        .append(value(execution.getSinkCommittedRecordCount()))
        .append('\n')
        .append("sourceAverageQps: ")
        .append(decimal(execution.getSourceAverageQps()))
        .append('\n')
        .append("sinkAverageQps: ")
        .append(decimal(execution.getSinkAverageQps()))
        .append('\n')
        .append("durationMillis: ")
        .append(value(execution.getDurationMillis()))
        .append('\n');
    if (StringUtils.hasText(execution.getErrorMessage())) {
      log.append("error: ")
          .append(execution.getErrorMessage())
          .append('\n');
    }

    log.append("\n# State Events\n");
    for (ExecutionEventRecord event : repository.listExecutionEvents(id)) {
      log.append(format(event.getCreateTime()))
          .append(" [")
          .append(event.getEventType())
          .append("] ")
          .append(text(event.getFromStatus()))
          .append(" -> ")
          .append(text(event.getToStatus()));
      if (StringUtils.hasText(event.getMessage())) {
        log.append(" | ").append(event.getMessage());
      }
      log.append('\n');
    }
    return log.toString();
  }

  public OfflineJobExecutionVO toVO(OfflineJobExecutionPO execution) {
    return OfflineJobExecutionVO.builder()
        .id(execution.getId())
        .jobDefinitionId(execution.getJobDefinitionId())
        .definitionVersion(execution.getDefinitionVersion())
        .engineBaseUrl(execution.getEngineBaseUrl())
        .engineJobId(execution.getEngineJobId())
        .externalExecutionId(execution.getExternalExecutionId())
        .workerInstanceId(execution.getWorkerInstanceId())
        .status(execution.getStatus())
        .stateVersion(value(execution.getStateVersion()))
        .attemptNo(value(execution.getAttemptNo()))
        .triggerType(execution.getTriggerType())
        .retryFromExecutionId(execution.getRetryFromExecutionId())
        .cancellationRequested(
            Boolean.TRUE.equals(execution.getCancellationRequested()))
        .errorMessage(execution.getErrorMessage())
        .sourceRecordCount(value(execution.getSourceRecordCount()))
        .sinkAttemptedRecordCount(
            value(execution.getSinkAttemptedRecordCount()))
        .sinkSuccessRecordCount(value(execution.getSinkSuccessRecordCount()))
        .sinkCommittedRecordCount(
            value(execution.getSinkCommittedRecordCount()))
        .sourceReadBytes(value(execution.getSourceReadBytes()))
        .sinkWrittenBytes(value(execution.getSinkWrittenBytes()))
        .sourceAverageQps(value(execution.getSourceAverageQps()))
        .sinkAverageQps(value(execution.getSinkAverageQps()))
        .failedRecordCount(value(execution.getFailedRecordCount()))
        .skippedRecordCount(value(execution.getSkippedRecordCount()))
        .databaseCommitMillis(value(execution.getDatabaseCommitMillis()))
        .sqlExecutionMillis(value(execution.getSqlExecutionMillis()))
        .qps(value(execution.getQps()))
        .durationMillis(value(execution.getDurationMillis()))
        .createTime(format(execution.getCreateTime()))
        .startTime(format(execution.getStartTime()))
        .endTime(format(execution.getEndTime()))
        .nextRetryTime(format(execution.getNextRetryTime()))
        .lastSyncTime(format(execution.getLastSyncTime()))
        .updateTime(format(execution.getUpdateTime()))
        .build();
  }

  private String format(LocalDateTime value) {
    return value == null ? null : value.format(FORMAT);
  }

  private String text(String value) {
    return StringUtils.hasText(value) ? value : "-";
  }

  private String decimal(Double value) {
    return value == null
        ? "0"
        : String.format(java.util.Locale.ROOT, "%.3f", value);
  }

  private long value(Long value) {
    return value == null ? 0L : value;
  }

  private int value(Integer value) {
    return value == null ? 0 : value;
  }

  private double value(Double value) {
    return value == null ? 0D : value;
  }
}
