package io.yak.ops.business.sync.offline.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import io.yak.framework.common.PagingData;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.dao.OfflineJobDefinitionDao;
import io.yak.ops.business.sync.offline.dao.OfflineJobExecutionDao;
import io.yak.ops.business.sync.offline.engine.LinkUpClient;
import io.yak.ops.common.bean.dto.sync.offline.OfflineBatchOperationDTO;
import io.yak.ops.common.bean.dto.sync.offline.OfflineJobExecutionQueryDTO;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobDefinitionPO;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobExecutionPO;
import io.yak.ops.common.bean.vo.sync.offline.OfflineBatchOperationErrorVO;
import io.yak.ops.common.bean.vo.sync.offline.OfflineBatchOperationVO;
import io.yak.ops.common.bean.vo.sync.offline.OfflineJobExecutionDetailVO;
import io.yak.ops.common.bean.vo.sync.offline.OfflineJobExecutionVO;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** 离线同步任务执行与 Link-Up 作业生命周期服务。 */
@ConditionalOnOfflineSyncEnabled
@Service
public class OfflineJobExecutionService {

  private static final DateTimeFormatter DATE_TIME_FORMATTER =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

  private final OfflineJobDefinitionService definitionService;
  private final OfflineJobDefinitionDao definitionDao;
  private final OfflineJobExecutionDao executionDao;
  private final OfflineExecutionSynchronizer synchronizer;
  private final LinkUpClient linkUpClient;

  public OfflineJobExecutionService(
      OfflineJobDefinitionService definitionService,
      OfflineJobDefinitionDao definitionDao,
      OfflineJobExecutionDao executionDao,
      OfflineExecutionSynchronizer synchronizer,
      LinkUpClient linkUpClient) {
    this.definitionService = definitionService;
    this.definitionDao = definitionDao;
    this.executionDao = executionDao;
    this.synchronizer = synchronizer;
    this.linkUpClient = linkUpClient;
  }

  public OfflineJobExecutionVO execute(Long definitionId) {
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
    executionDao.insert(execution);

    definition.setLastExecutionId(execution.getId());
    definition.setLastJobStatus("RUNNING");
    definition.setLastErrorMessage(null);
    definition.setUpdateTime(now);
    definitionDao.updateById(definition);

    try {
      JsonNode summary = linkUpClient.submit(definition.getHoconConfig());
      String engineJobId = summary.path("jobId").asText(null);
      if (!StringUtils.hasText(engineJobId)) {
        throw new IllegalStateException("Link-Up 提交成功但未返回 jobId");
      }
      execution.setEngineJobId(engineJobId);
      definition.setLastEngineJobId(engineJobId);
      definitionDao.updateById(definition);
      executionDao.updateById(execution);
      synchronizer.apply(definition, execution, summary);
      return toVO(execution);
    } catch (RuntimeException exception) {
      fail(definition, execution, exception.getMessage());
      throw exception;
    }
  }

  public OfflineJobExecutionVO cancel(Long executionId) {
    OfflineJobExecutionPO execution = require(executionId);
    synchronizer.refreshExecution(execution);
    if (!synchronizer.isActive(execution.getStatus())) {
      throw new IllegalStateException("当前任务实例已结束，无需停止");
    }
    if (!StringUtils.hasText(execution.getEngineJobId())) {
      throw new IllegalStateException("任务实例没有 Link-Up jobId");
    }
    JsonNode summary = linkUpClient.cancel(execution.getEngineJobId());
    OfflineJobDefinitionPO definition = definitionDao.selectById(execution.getJobDefinitionId());
    synchronizer.apply(definition, execution, summary);
    return toVO(execution);
  }

  public OfflineJobExecutionVO cancelLatest(Long definitionId) {
    OfflineJobDefinitionPO definition = definitionService.require(definitionId);
    if (definition.getLastExecutionId() == null) {
      throw new IllegalStateException("任务没有可停止的运行实例");
    }
    return cancel(definition.getLastExecutionId());
  }

  public OfflineBatchOperationVO batchExecute(OfflineBatchOperationDTO requestDTO) {
    return batch(requestDTO, true);
  }

  public OfflineBatchOperationVO batchCancel(OfflineBatchOperationDTO requestDTO) {
    return batch(requestDTO, false);
  }

  public OfflineJobExecutionVO get(Long executionId) {
    OfflineJobExecutionPO execution = require(executionId);
    synchronizer.refreshExecution(execution);
    return toVO(execution);
  }

  public OfflineJobExecutionDetailVO detail(Long executionId) {
    OfflineJobExecutionPO execution = require(executionId);
    synchronizer.refreshExecution(execution);
    OfflineJobExecutionDetailVO detail =
        OfflineJobExecutionDetailVO.builder().execution(toVO(execution)).build();
    if (StringUtils.hasText(execution.getEngineJobId())) {
      detail.setJob(linkUpClient.getJob(execution.getEngineJobId()));
      detail.setPipelines(linkUpClient.pipelines(execution.getEngineJobId()));
      detail.setTasks(linkUpClient.tasks(execution.getEngineJobId()));
      detail.setMetrics(linkUpClient.metrics(execution.getEngineJobId()));
    }
    return detail;
  }

  public JsonNode tableMetrics(Long executionId) {
    OfflineJobExecutionPO execution = require(executionId);
    if (!StringUtils.hasText(execution.getEngineJobId())) {
      return JsonNodeFactory.instance.arrayNode();
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

  public PagingData<OfflineJobExecutionVO> page(OfflineJobExecutionQueryDTO queryDTO) {
    IPage<OfflineJobExecutionPO> page = executionDao.selectPage(queryDTO);
    List<OfflineJobExecutionVO> records = new ArrayList<>(page.getRecords().size());
    for (OfflineJobExecutionPO execution : page.getRecords()) {
      synchronizer.refreshExecution(execution);
      records.add(toVO(execution));
    }
    return new PagingData<>(records, page);
  }

  private OfflineBatchOperationVO batch(OfflineBatchOperationDTO requestDTO, boolean execute) {
    if (requestDTO == null
        || requestDTO.getJobDefinitionIds() == null
        || requestDTO.getJobDefinitionIds().isEmpty()) {
      throw new IllegalArgumentException("jobDefinitionIds 不能为空");
    }
    int successCount = 0;
    List<OfflineBatchOperationErrorVO> errors = new ArrayList<>();
    for (Long definitionId : requestDTO.getJobDefinitionIds()) {
      try {
        if (definitionId == null || definitionId <= 0L) {
          throw new IllegalArgumentException("任务定义 ID 不合法");
        }
        if (execute) {
          execute(definitionId);
        } else {
          cancelLatest(definitionId);
        }
        successCount++;
      } catch (RuntimeException exception) {
        errors.add(
            OfflineBatchOperationErrorVO.builder()
                .jobDefinitionId(definitionId)
                .message(exception.getMessage())
                .build());
      }
    }
    return OfflineBatchOperationVO.builder()
        .successCount(successCount)
        .failedCount(errors.size())
        .errors(errors)
        .build();
  }

  private OfflineJobExecutionPO require(Long executionId) {
    if (executionId == null || executionId <= 0L) {
      throw new IllegalArgumentException("任务实例 ID 不合法");
    }
    OfflineJobExecutionPO execution = executionDao.selectById(executionId);
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
    executionDao.updateById(execution);
    definition.setLastJobStatus("FAILED");
    definition.setLastErrorMessage(message);
    definition.setLastEndTime(now);
    definition.setUpdateTime(now);
    definitionDao.updateById(definition);
  }

  private OfflineJobExecutionVO toVO(OfflineJobExecutionPO execution) {
    return OfflineJobExecutionVO.builder()
        .id(execution.getId())
        .jobDefinitionId(execution.getJobDefinitionId())
        .engineJobId(execution.getEngineJobId())
        .status(execution.getStatus())
        .errorMessage(execution.getErrorMessage())
        .sourceRecordCount(number(execution.getSourceRecordCount()))
        .sinkSuccessRecordCount(number(execution.getSinkSuccessRecordCount()))
        .sourceReadBytes(number(execution.getSourceReadBytes()))
        .sinkWrittenBytes(number(execution.getSinkWrittenBytes()))
        .qps(execution.getQps() == null ? 0D : execution.getQps())
        .durationMillis(number(execution.getDurationMillis()))
        .createTime(format(execution.getCreateTime()))
        .startTime(format(execution.getStartTime()))
        .endTime(format(execution.getEndTime()))
        .updateTime(format(execution.getUpdateTime()))
        .build();
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
