package io.yak.ops.business.workflow.web;

import io.yak.ops.business.workflow.config.ConditionalOnWorkflowEnabled;
import io.yak.framework.common.Result;
import io.yak.ops.business.workflow.model.WorkflowDag;
import io.yak.ops.business.workflow.model.WorkflowEnums.FailureStrategy;
import io.yak.ops.business.workflow.model.WorkflowEnums.MisfirePolicy;
import io.yak.ops.business.workflow.model.WorkflowEnums.ScheduleConcurrencyPolicy;
import io.yak.ops.business.workflow.model.WorkflowEnums.TriggerType;
import io.yak.ops.business.workflow.model.WorkflowRecords.Attempt;
import io.yak.ops.business.workflow.model.WorkflowRecords.Definition;
import io.yak.ops.business.workflow.model.WorkflowRecords.Instance;
import io.yak.ops.business.workflow.model.WorkflowRecords.Schedule;
import io.yak.ops.business.workflow.model.WorkflowRecords.TaskInstance;
import io.yak.ops.business.workflow.model.WorkflowRecords.Version;
import io.yak.ops.business.workflow.schedule.WorkflowScheduleService;
import io.yak.ops.business.workflow.service.WorkflowDefinitionService;
import io.yak.ops.business.workflow.service.WorkflowExecutionService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;
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

/** Backend API for workflow definitions, published versions, instances and schedules. */
@ConditionalOnWorkflowEnabled
@RestController
@RequestMapping("/api/v1/workflows")
public class WorkflowController {

  private final WorkflowDefinitionService definitions;
  private final WorkflowExecutionService executions;
  private final WorkflowScheduleService schedules;

  public WorkflowController(
      WorkflowDefinitionService definitions,
      WorkflowExecutionService executions,
      WorkflowScheduleService schedules) {
    this.definitions = definitions;
    this.executions = executions;
    this.schedules = schedules;
  }

  @PostMapping
  public Result<Map<String, Long>> create(
      @Valid @RequestBody CreateWorkflowRequest request,
      @RequestHeader(name = "X-Operator", defaultValue = "SYSTEM") String operator) {
    long workflowId = definitions.create(
        request.code(),
        request.name(),
        request.description(),
        request.failureStrategy(),
        request.maxParallelism(),
        request.dag(),
        operator);
    return Result.success(Map.of("workflowId", workflowId));
  }

  @PutMapping("/{workflowId}/draft")
  public Result<Boolean> updateDraft(
      @PathVariable long workflowId,
      @Valid @RequestBody UpdateWorkflowRequest request) {
    definitions.updateDraft(
        workflowId,
        request.name(),
        request.description(),
        request.failureStrategy(),
        request.maxParallelism(),
        request.dag());
    return Result.success(true);
  }

  @PostMapping("/{workflowId}/publish")
  public Result<Version> publish(
      @PathVariable long workflowId,
      @RequestHeader(name = "X-Operator", defaultValue = "SYSTEM") String operator) {
    return Result.success(definitions.publish(workflowId, operator));
  }

  @GetMapping
  public Result<List<Definition>> listDefinitions() {
    return Result.success(definitions.list());
  }

  @GetMapping("/{workflowId}")
  public Result<Definition> getDefinition(@PathVariable long workflowId) {
    return Result.success(definitions.get(workflowId));
  }

  @PostMapping("/{workflowId}/run")
  public Result<Map<String, Long>> run(
      @PathVariable long workflowId,
      @RequestBody(required = false) TriggerWorkflowRequest request,
      @RequestHeader(name = "X-Operator", defaultValue = "SYSTEM") String operator) {
    long instanceId = executions.trigger(
        workflowId,
        TriggerType.MANUAL,
        request == null || request.globalParameters() == null ? Map.of() : request.globalParameters(),
        operator);
    return Result.success(Map.of("workflowInstanceId", instanceId));
  }

  @GetMapping("/{workflowId}/instances")
  public Result<List<Instance>> listInstances(
      @PathVariable long workflowId,
      @RequestParam(defaultValue = "50") int limit) {
    return Result.success(executions.list(workflowId, limit));
  }

  @PutMapping("/{workflowId}/schedule")
  public Result<Schedule> upsertSchedule(
      @PathVariable long workflowId,
      @Valid @RequestBody ScheduleWorkflowRequest request) {
    return Result.success(schedules.upsert(
        workflowId,
        request.cronExpression(),
        request.timezone(),
        request.enabled(),
        request.misfirePolicy(),
        request.concurrencyPolicy()));
  }

  @GetMapping("/{workflowId}/schedule")
  public Result<Schedule> getSchedule(@PathVariable long workflowId) {
    return Result.success(schedules.get(workflowId));
  }

  @DeleteMapping("/{workflowId}/schedule")
  public Result<Boolean> deleteSchedule(@PathVariable long workflowId) {
    schedules.delete(workflowId);
    return Result.success(true);
  }

  public record CreateWorkflowRequest(
      @NotBlank String code,
      @NotBlank String name,
      String description,
      FailureStrategy failureStrategy,
      @Min(1) @Max(256) int maxParallelism,
      @Valid WorkflowDag dag) {
  }

  public record UpdateWorkflowRequest(
      @NotBlank String name,
      String description,
      FailureStrategy failureStrategy,
      @Min(1) @Max(256) int maxParallelism,
      @Valid WorkflowDag dag) {
  }

  public record TriggerWorkflowRequest(Map<String, Object> globalParameters) {
  }

  public record ScheduleWorkflowRequest(
      @NotBlank String cronExpression,
      @NotBlank String timezone,
      boolean enabled,
      MisfirePolicy misfirePolicy,
      ScheduleConcurrencyPolicy concurrencyPolicy) {
  }
}
