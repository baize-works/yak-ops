package io.yak.ops.business.workflow.controller.v1;

import io.yak.framework.common.Result;
import io.yak.ops.business.workflow.common.constant.WorkflowConstant;
import io.yak.ops.business.workflow.common.dto.workflow.WorkflowDTO;
import io.yak.ops.business.workflow.common.dto.workflow.WorkflowScheduleDTO;
import io.yak.ops.business.workflow.common.dto.workflow.WorkflowTriggerDTO;
import io.yak.ops.business.workflow.common.dto.workflow.WorkflowUpdateDTO;
import io.yak.ops.business.workflow.common.enums.TriggerType;
import io.yak.ops.business.workflow.common.vo.workflow.WorkflowDefinitionVO;
import io.yak.ops.business.workflow.common.vo.workflow.WorkflowInstanceVO;
import io.yak.ops.business.workflow.common.vo.workflow.WorkflowScheduleVO;
import io.yak.ops.business.workflow.common.vo.workflow.WorkflowVersionVO;
import io.yak.ops.business.workflow.config.ConditionalOnWorkflowEnabled;
import io.yak.ops.business.workflow.service.WorkflowDefinitionService;
import io.yak.ops.business.workflow.service.WorkflowExecutionService;
import io.yak.ops.business.workflow.service.WorkflowScheduleService;
import jakarta.validation.Valid;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 工作流定义、发布、运行和调度接口。 */
@ConditionalOnWorkflowEnabled
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/workflows")
public class WorkflowController {

  private final WorkflowDefinitionService definitionService;
  private final WorkflowExecutionService executionService;
  private final WorkflowScheduleService scheduleService;

  @PostMapping
  public Result<Map<String, Long>> addWorkflow(
      @Valid @RequestBody WorkflowDTO workflowDTO,
      @RequestHeader(
          name = "X-Operator",
          defaultValue = WorkflowConstant.SYSTEM_OPERATOR) String operator) {
    Long workflowId = definitionService.addWorkflow(workflowDTO, operator);
    return Result.success(Map.of("workflowId", workflowId));
  }

  @PutMapping("/{workflowId}/draft")
  public Result<Boolean> editWorkflow(
      @PathVariable Long workflowId,
      @Valid @RequestBody WorkflowUpdateDTO workflowDTO) {
    definitionService.editWorkflow(workflowId, workflowDTO);
    return Result.success(true);
  }

  @PostMapping("/{workflowId}/publish")
  public Result<WorkflowVersionVO> publishWorkflow(
      @PathVariable Long workflowId,
      @RequestHeader(
          name = "X-Operator",
          defaultValue = WorkflowConstant.SYSTEM_OPERATOR) String operator) {
    return Result.success(definitionService.publishWorkflow(workflowId, operator));
  }

  @GetMapping
  public Result<List<WorkflowDefinitionVO>> getWorkflowList() {
    return Result.success(definitionService.getWorkflowList());
  }

  @GetMapping("/{workflowId}")
  public Result<WorkflowDefinitionVO> getWorkflow(@PathVariable Long workflowId) {
    return Result.success(definitionService.getWorkflow(workflowId));
  }

  @PostMapping("/{workflowId}/run")
  public Result<Map<String, Long>> runWorkflow(
      @PathVariable Long workflowId,
      @RequestBody(required = false) WorkflowTriggerDTO triggerDTO,
      @RequestHeader(
          name = "X-Operator",
          defaultValue = WorkflowConstant.SYSTEM_OPERATOR) String operator) {
    Map<String, Object> parameters = triggerDTO == null
        ? new LinkedHashMap<>()
        : triggerDTO.getGlobalParameters();
    Long instanceId = executionService.triggerWorkflow(
        workflowId,
        TriggerType.MANUAL,
        parameters,
        operator);
    return Result.success(Map.of("workflowInstanceId", instanceId));
  }

  @GetMapping("/{workflowId}/instances")
  public Result<List<WorkflowInstanceVO>> getWorkflowInstanceList(
      @PathVariable Long workflowId,
      @RequestParam(defaultValue = "50") int limit) {
    return Result.success(executionService.getWorkflowInstanceList(workflowId, limit));
  }

  @PutMapping("/{workflowId}/schedule")
  public Result<WorkflowScheduleVO> saveOrUpdateSchedule(
      @PathVariable Long workflowId,
      @Valid @RequestBody WorkflowScheduleDTO scheduleDTO) {
    return Result.success(scheduleService.saveOrUpdate(workflowId, scheduleDTO));
  }

  @GetMapping("/{workflowId}/schedule")
  public Result<WorkflowScheduleVO> getSchedule(@PathVariable Long workflowId) {
    return Result.success(scheduleService.get(workflowId));
  }

  @DeleteMapping("/{workflowId}/schedule")
  public Result<Boolean> deleteSchedule(@PathVariable Long workflowId) {
    scheduleService.delete(workflowId);
    return Result.success(true);
  }
}
