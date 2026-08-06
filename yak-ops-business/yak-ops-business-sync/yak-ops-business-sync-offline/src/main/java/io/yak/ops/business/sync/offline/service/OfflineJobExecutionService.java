package io.yak.ops.business.sync.offline.service;

import com.fasterxml.jackson.databind.JsonNode;
import io.yak.framework.common.PagingData;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.engine.LinkUpClient.LinkUpJobResponse;
import io.yak.ops.common.bean.dto.sync.offline.OfflineBatchOperationDTO;
import io.yak.ops.common.bean.dto.sync.offline.OfflineJobExecutionQueryDTO;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobDefinitionPO;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobExecutionPO;
import io.yak.ops.common.bean.vo.sync.offline.OfflineBatchOperationErrorVO;
import io.yak.ops.common.bean.vo.sync.offline.OfflineBatchOperationVO;
import io.yak.ops.common.bean.vo.sync.offline.OfflineExecutionLogPageVO;
import io.yak.ops.common.bean.vo.sync.offline.OfflineJobExecutionDetailVO;
import io.yak.ops.common.bean.vo.sync.offline.OfflineJobExecutionVO;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** 离线同步执行门面。 */
@ConditionalOnOfflineSyncEnabled
@Service
@RequiredArgsConstructor
public class OfflineJobExecutionService {
  private final OfflineExecutionOrchestrator orchestrator;
  private final OfflineExecutionReadService readService;
  private final OfflineExecutionLogService logService;
  private final OfflineJobDefinitionService definitionService;

  public OfflineJobExecutionVO execute(Long id) {
    return readService.toVO(
        orchestrator.execute(id, "MANUAL", null, 1));
  }

  public OfflineJobExecutionVO executeScheduled(Long id) {
    return readService.toVO(
        orchestrator.execute(id, "SCHEDULE", null, 1));
  }

  public OfflineJobExecutionVO retry(Long id) {
    return readService.toVO(
        orchestrator.retryFrom(readService.require(id)));
  }

  public OfflineJobExecutionVO retryFrom(OfflineJobExecutionPO previous) {
    return readService.toVO(orchestrator.retryFrom(previous));
  }

  public OfflineJobExecutionVO cancel(Long id) {
    return readService.toVO(orchestrator.cancel(id));
  }

  public OfflineJobExecutionVO cancelLatest(Long definitionId) {
    OfflineJobDefinitionPO definition = definitionService.require(definitionId);
    if (definition.getLastExecutionId() == null) {
      throw new IllegalStateException("任务没有可停止的执行实例");
    }
    return cancel(definition.getLastExecutionId());
  }

  public OfflineBatchOperationVO batchExecute(OfflineBatchOperationDTO request) {
    return batch(request, true);
  }

  public OfflineBatchOperationVO batchCancel(OfflineBatchOperationDTO request) {
    return batch(request, false);
  }

  public PagingData<OfflineJobExecutionVO> page(
      OfflineJobExecutionQueryDTO query) {
    return readService.page(query);
  }

  public OfflineJobExecutionDetailVO detail(Long id) {
    return readService.detail(id);
  }

  public JsonNode tableMetrics(Long id) {
    return readService.tableMetrics(id);
  }

  /** 旧文本接口保留给历史页面和脚本。 */
  public String logs(Long id) {
    return readService.logs(id);
  }

  public OfflineExecutionLogPageVO logs(
      Long id,
      String cursor,
      int limit) {
    return logService.logs(
        readService.require(id),
        cursor,
        limit);
  }

  public void applySnapshot(
      OfflineJobExecutionPO execution,
      LinkUpJobResponse response,
      String type) {
    orchestrator.applySnapshot(execution, response, type);
  }

  public void markLost(
      OfflineJobExecutionPO execution,
      String message) {
    orchestrator.markLost(execution, message);
  }

  private OfflineBatchOperationVO batch(
      OfflineBatchOperationDTO request,
      boolean execute) {
    if (request == null
        || request.getJobDefinitionIds() == null
        || request.getJobDefinitionIds().isEmpty()) {
      throw new IllegalArgumentException("jobDefinitionIds 不能为空");
    }

    int success = 0;
    List<OfflineBatchOperationErrorVO> errors = new ArrayList<>();
    for (Long id : request.getJobDefinitionIds()) {
      try {
        if (id == null || id <= 0L) {
          throw new IllegalArgumentException("任务定义 ID 不合法");
        }
        if (execute) {
          execute(id);
        } else {
          cancelLatest(id);
        }
        success++;
      } catch (RuntimeException exception) {
        errors.add(
            OfflineBatchOperationErrorVO.builder()
                .jobDefinitionId(id)
                .message(exception.getMessage())
                .build());
      }
    }

    return OfflineBatchOperationVO.builder()
        .successCount(success)
        .failedCount(errors.size())
        .errors(errors)
        .build();
  }
}
