package io.yak.ops.business.workflow.web;

import io.yak.framework.common.Result;
import io.yak.ops.business.workflow.config.ConditionalOnWorkflowEnabled;
import io.yak.ops.business.workflow.model.WorkflowDag;
import io.yak.ops.business.workflow.model.WorkflowEnums.FailureStrategy;
import io.yak.ops.business.workflow.model.WorkflowEnums.MisfirePolicy;
import io.yak.ops.business.workflow.model.WorkflowEnums.ScheduleConcurrencyPolicy;
import io.yak.ops.business.workflow.model.WorkflowEnums.TriggerType;
import io.yak.ops.business.workflow.model.WorkflowRecords.Definition;
import io.yak.ops.business.workflow.model.WorkflowRecords.Instance;
import io.yak.ops.business.workflow.model.WorkflowRecords.Schedule;
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

  public static class CreateWorkflowRequest {

    @NotBlank
    private String code;
    @NotBlank
    private String name;
    private String description;
    private FailureStrategy failureStrategy;
    @Min(1)
    @Max(256)
    private int maxParallelism;
    @Valid
    private WorkflowDag dag;

    public CreateWorkflowRequest() {
    }

    public CreateWorkflowRequest(
        String code,
        String name,
        String description,
        FailureStrategy failureStrategy,
        int maxParallelism,
        WorkflowDag dag) {
      this.code = code;
      this.name = name;
      this.description = description;
      this.failureStrategy = failureStrategy;
      this.maxParallelism = maxParallelism;
      this.dag = dag;
    }

    public String code() { return code; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String name() { return name; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String description() { return description; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public FailureStrategy failureStrategy() { return failureStrategy; }
    public FailureStrategy getFailureStrategy() { return failureStrategy; }
    public void setFailureStrategy(FailureStrategy failureStrategy) {
      this.failureStrategy = failureStrategy;
    }
    public int maxParallelism() { return maxParallelism; }
    public int getMaxParallelism() { return maxParallelism; }
    public void setMaxParallelism(int maxParallelism) { this.maxParallelism = maxParallelism; }
    public WorkflowDag dag() { return dag; }
    public WorkflowDag getDag() { return dag; }
    public void setDag(WorkflowDag dag) { this.dag = dag; }
  }

  public static class UpdateWorkflowRequest {

    @NotBlank
    private String name;
    private String description;
    private FailureStrategy failureStrategy;
    @Min(1)
    @Max(256)
    private int maxParallelism;
    @Valid
    private WorkflowDag dag;

    public UpdateWorkflowRequest() {
    }

    public UpdateWorkflowRequest(
        String name,
        String description,
        FailureStrategy failureStrategy,
        int maxParallelism,
        WorkflowDag dag) {
      this.name = name;
      this.description = description;
      this.failureStrategy = failureStrategy;
      this.maxParallelism = maxParallelism;
      this.dag = dag;
    }

    public String name() { return name; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String description() { return description; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public FailureStrategy failureStrategy() { return failureStrategy; }
    public FailureStrategy getFailureStrategy() { return failureStrategy; }
    public void setFailureStrategy(FailureStrategy failureStrategy) {
      this.failureStrategy = failureStrategy;
    }
    public int maxParallelism() { return maxParallelism; }
    public int getMaxParallelism() { return maxParallelism; }
    public void setMaxParallelism(int maxParallelism) { this.maxParallelism = maxParallelism; }
    public WorkflowDag dag() { return dag; }
    public WorkflowDag getDag() { return dag; }
    public void setDag(WorkflowDag dag) { this.dag = dag; }
  }

  public static class TriggerWorkflowRequest {

    private Map<String, Object> globalParameters;

    public TriggerWorkflowRequest() {
    }

    public TriggerWorkflowRequest(Map<String, Object> globalParameters) {
      this.globalParameters = globalParameters;
    }

    public Map<String, Object> globalParameters() { return globalParameters; }
    public Map<String, Object> getGlobalParameters() { return globalParameters; }
    public void setGlobalParameters(Map<String, Object> globalParameters) {
      this.globalParameters = globalParameters;
    }
  }

  public static class ScheduleWorkflowRequest {

    @NotBlank
    private String cronExpression;
    @NotBlank
    private String timezone;
    private boolean enabled;
    private MisfirePolicy misfirePolicy;
    private ScheduleConcurrencyPolicy concurrencyPolicy;

    public ScheduleWorkflowRequest() {
    }

    public ScheduleWorkflowRequest(
        String cronExpression,
        String timezone,
        boolean enabled,
        MisfirePolicy misfirePolicy,
        ScheduleConcurrencyPolicy concurrencyPolicy) {
      this.cronExpression = cronExpression;
      this.timezone = timezone;
      this.enabled = enabled;
      this.misfirePolicy = misfirePolicy;
      this.concurrencyPolicy = concurrencyPolicy;
    }

    public String cronExpression() { return cronExpression; }
    public String getCronExpression() { return cronExpression; }
    public void setCronExpression(String cronExpression) {
      this.cronExpression = cronExpression;
    }
    public String timezone() { return timezone; }
    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }
    public boolean enabled() { return enabled; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public MisfirePolicy misfirePolicy() { return misfirePolicy; }
    public MisfirePolicy getMisfirePolicy() { return misfirePolicy; }
    public void setMisfirePolicy(MisfirePolicy misfirePolicy) {
      this.misfirePolicy = misfirePolicy;
    }
    public ScheduleConcurrencyPolicy concurrencyPolicy() { return concurrencyPolicy; }
    public ScheduleConcurrencyPolicy getConcurrencyPolicy() { return concurrencyPolicy; }
    public void setConcurrencyPolicy(ScheduleConcurrencyPolicy concurrencyPolicy) {
      this.concurrencyPolicy = concurrencyPolicy;
    }
  }
}
