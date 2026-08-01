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
import io.yak.ops.common.bean.vo.sync.offline.OfflineJobExecutionDetailVO;
import io.yak.ops.common.bean.vo.sync.offline.OfflineJobExecutionVO;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * 离线同步执行命令与读模型门面。
 *
 * @author weifuwan
 */
@ConditionalOnOfflineSyncEnabled
@Service
@RequiredArgsConstructor
public class OfflineJobExecutionService {

  private final OfflineExecutionOrchestrator orchestrator;
  private final OfflineExecutionReadService readService;
  private final OfflineJobDefinitionService definitionService;

  public OfflineJobExecutionVO execute(Long definitionId) {
    return readService.toVO(orchestrator.execute(definitionId, "MANUAL", null, 1));
  }

  public OfflineJobExecutionVO executeScheduled(Long definitionId) {
    return readService.toVO(orchestrator.execute(definitionId, "SCHEDULE", null, 1));
  }

  public OfflineJobExecutionVO retry(Long executionId) {
    return readService.toVO(orchestrator.retryFrom(readService.require(executionId)));
  }

  public OfflineJobExecutionVO retryFrom(OfflineJobExecutionPO previous) {
    return readService.toVO(orchestrator.retryFrom(previous));
  }

  public OfflineJobExecutionVO cancel(Long executionId) {
    return readService.toVO(orchestrator.cancel(executionId));
  }

  public OfflineJobExecutionVO cancelLatest(Long definitionId) {
    OfflineJobDefinitionPO definition = definitionService.require(definitionId);
    if (definition.getLastExecutionId() == null) {
      throw new IllegalStateException("任务没有可停止的执行实例");
    }
    return cancel(definition.getLastExecutionId());
  }

  public OfflineBatchOperationVO batchExecute(OfflineBatchOperationDTO requestDTO) {
    return batch(requestDTO, true);
  }

  public OfflineBatchOperationVO batchCancel(OfflineBatchOperationDTO requestDTO) {
    return batch(requestDTO, false);
  }

  public PagingData<OfflineJobExecutionVO> page(OfflineJobExecutionQueryDTO queryDTO) {
    return readService.page(queryDTO);
  }

  public OfflineJobExecutionDetailVO detail(Long id) {
    return readService.detail(id);
  }

  public JsonNode tableMetrics(Long id) {
    return readService.tableMetrics(id);
  }

  public String logs(Long id) {
    return readService.logs(id);
  }

  public void applySnapshot(
      OfflineJobExecutionPO execution, LinkUpJobResponse response, String eventType) {
    orchestrator.applySnapshot(execution, response, eventType);
  }

  public void markLost(OfflineJobExecutionPO execution, String message) {
    orchestrator.markLost(execution, message);
  }

  private OfflineBatchOperationVO batch(OfflineBatchOperationDTO requestDTO, boolean execute) {
    if (requestDTO == null || requestDTO.getJobDefinitionIds() == null
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
        errors.add(OfflineBatchOperationErrorVO.builder()
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
}
