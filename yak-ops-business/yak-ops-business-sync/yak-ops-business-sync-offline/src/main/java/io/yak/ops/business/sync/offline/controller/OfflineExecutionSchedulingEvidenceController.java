package io.yak.ops.business.sync.offline.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.framework.common.Result;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.dao.OfflineJobExecutionDao;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobExecutionPO;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 多 Worker 能力、可达性和评分的完整审计接口。 */
@ConditionalOnOfflineSyncEnabled
@RestController
@RequestMapping("/api/v1/offline/executions")
public class OfflineExecutionSchedulingEvidenceController {

  private final OfflineJobExecutionDao executionDao;
  private final ObjectMapper objectMapper;

  public OfflineExecutionSchedulingEvidenceController(
      OfflineJobExecutionDao executionDao,
      @Qualifier("offlineSyncJsonMapper") ObjectMapper objectMapper) {
    this.executionDao = executionDao;
    this.objectMapper = objectMapper;
  }

  @GetMapping("/{executionId}/scheduling-evidence")
  public Result<Map<String, Object>> evidence(@PathVariable Long executionId) {
    if (executionId == null || executionId <= 0L) {
      throw new IllegalArgumentException("任务实例 ID 不合法");
    }
    OfflineJobExecutionPO execution = executionDao.selectById(executionId);
    if (execution == null) {
      throw new IllegalArgumentException("离线同步任务实例不存在：" + executionId);
    }

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("executionId", execution.getId());
    result.put("jobDefinitionId", execution.getJobDefinitionId());
    result.put("definitionVersion", execution.getDefinitionVersion());
    result.put("engineNodeId", execution.getEngineNodeId());
    result.put("engineNodeBaseUrl", execution.getEngineNodeBaseUrl());
    result.put("workerInstanceId", execution.getWorkerInstanceId());
    result.put("assignmentMode", execution.getAssignmentMode());
    result.put("assignmentScore", execution.getAssignmentScore());
    result.put("assignmentReason", execution.getAssignmentReason());
    result.put("requiredCapabilities", parse(execution.getRequiredCapabilitiesJson()));
    result.put("assignedCapabilities", parse(execution.getAssignedCapabilitiesJson()));
    result.put("reachabilityRequirements", parse(execution.getReachabilityRequirementsJson()));
    result.put("assignedReachability", parse(execution.getAssignedReachabilityJson()));
    result.put("candidates", parse(execution.getAssignmentCandidatesJson()));
    return Result.success(result);
  }

  private JsonNode parse(String value) {
    if (value == null || value.trim().isEmpty()) {
      return null;
    }
    try {
      return objectMapper.readTree(value);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("执行调度审计 JSON 已损坏", exception);
    }
  }
}
