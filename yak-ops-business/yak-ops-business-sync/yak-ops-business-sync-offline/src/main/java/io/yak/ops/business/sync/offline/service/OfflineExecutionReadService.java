package io.yak.ops.business.sync.offline.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.fasterxml.jackson.databind.JsonNode;
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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * 执行历史、指标和日志的数据库读模型。
 *
 * @author weifuwan
 */
@ConditionalOnOfflineSyncEnabled
@Component
@RequiredArgsConstructor
public class OfflineExecutionReadService {

  private static final DateTimeFormatter FORMAT =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

  private final OfflineJobExecutionDao executionDao;
  private final OfflineExecutionControlRepository repository;
  private final LinkUpClient linkUpClient;

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

  public PagingData<OfflineJobExecutionVO> page(OfflineJobExecutionQueryDTO queryDTO) {
    IPage<OfflineJobExecutionPO> page = executionDao.selectPage(queryDTO);
    List<OfflineJobExecutionVO> records = new ArrayList<>(page.getRecords().size());
    for (OfflineJobExecutionPO execution : page.getRecords()) {
      records.add(toVO(execution));
    }
    return new PagingData<>(records, page);
  }

  public OfflineJobExecutionDetailVO detail(Long id) {
    OfflineJobExecutionPO execution = require(id);
    OfflineJobExecutionDetailVO detail = OfflineJobExecutionDetailVO.builder()
        .execution(toVO(execution)).build();
    if (StringUtils.hasText(execution.getEngineSnapshotJson())) {
      try {
        JsonNode snapshot = new com.fasterxml.jackson.databind.ObjectMapper()
            .readTree(execution.getEngineSnapshotJson());
        detail.setJob(snapshot);
        detail.setPipelines(snapshot.path("pipelines"));
        detail.setMetrics(snapshot.path("metrics"));
      } catch (Exception ignored) {
        // 历史快照损坏不影响执行记录查询。
      }
    }
    return detail;
  }

  public JsonNode tableMetrics(Long id) {
    OfflineJobExecutionPO execution = require(id);
    if (!StringUtils.hasText(execution.getEngineJobId())) {
      throw new IllegalStateException("当前执行实例尚未获得 Link-Up jobId，暂时无法查询表级指标");
    }
    return linkUpClient.pipelines(execution.getEngineJobId());
  }

  public String logs(Long id) {
    OfflineJobExecutionPO execution = require(id);
    StringBuilder log = new StringBuilder();
    log.append("# Yak Ops Offline Control Plane\n")
        .append("definitionId: ").append(execution.getJobDefinitionId()).append('\n')
        .append("executionId: ").append(execution.getId()).append('\n')
        .append("definitionVersion: ").append(value(execution.getDefinitionVersion())).append('\n')
        .append("externalExecutionId: ").append(text(execution.getExternalExecutionId())).append('\n')
        .append("engineNodeId: ").append(text(execution.getEngineNodeId())).append('\n')
        .append("workerInstanceId: ").append(text(execution.getWorkerInstanceId())).append('\n')
        .append("engineJobId: ").append(text(execution.getEngineJobId())).append('\n')
        .append("status: ").append(text(execution.getStatus())).append('\n')
        .append("attemptNo: ").append(value(execution.getAttemptNo())).append('\n')
        .append("sourceRecordCount: ").append(value(execution.getSourceRecordCount())).append('\n')
        .append("sinkSuccessRecordCount: ").append(value(execution.getSinkSuccessRecordCount())).append('\n')
        .append("durationMillis: ").append(value(execution.getDurationMillis())).append('\n');
    if (StringUtils.hasText(execution.getErrorMessage())) {
      log.append("error: ").append(execution.getErrorMessage()).append('\n');
    }
    log.append("\n# State Events\n");
    for (ExecutionEventRecord event : repository.listExecutionEvents(id)) {
      log.append(format(event.getCreateTime())).append(" [")
          .append(event.getEventType()).append("] ")
          .append(text(event.getFromStatus())).append(" -> ")
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
        .definitionVersionId(execution.getDefinitionVersionId())
        .definitionVersion(execution.getDefinitionVersion())
        .engineNodeId(execution.getEngineNodeId())
        .engineJobId(execution.getEngineJobId())
        .externalExecutionId(execution.getExternalExecutionId())
        .workerInstanceId(execution.getWorkerInstanceId())
        .stateVersion(value(execution.getStateVersion()))
        .attemptNo(value(execution.getAttemptNo()))
        .triggerType(execution.getTriggerType())
        .retryFromExecutionId(execution.getRetryFromExecutionId())
        .cancellationRequested(Boolean.TRUE.equals(execution.getCancellationRequested()))
        .nextRetryTime(format(execution.getNextRetryTime()))
        .status(execution.getStatus())
        .errorMessage(execution.getErrorMessage())
        .sourceRecordCount(value(execution.getSourceRecordCount()))
        .sinkSuccessRecordCount(value(execution.getSinkSuccessRecordCount()))
        .sourceReadBytes(value(execution.getSourceReadBytes()))
        .sinkWrittenBytes(value(execution.getSinkWrittenBytes()))
        .qps(execution.getQps() == null ? 0D : execution.getQps())
        .durationMillis(value(execution.getDurationMillis()))
        .createTime(format(execution.getCreateTime()))
        .startTime(format(execution.getStartTime()))
        .endTime(format(execution.getEndTime()))
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

  private long value(Long value) {
    return value == null ? 0L : value;
  }

  private int value(Integer value) {
    return value == null ? 0 : value;
  }
}
