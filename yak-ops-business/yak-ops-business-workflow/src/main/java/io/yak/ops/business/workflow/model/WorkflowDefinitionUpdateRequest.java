package io.yak.ops.business.workflow.model;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 工作流定义配置保存请求。 */
public record WorkflowDefinitionUpdateRequest(
    @NotBlank @Size(max = 100) String name,
    @Size(max = 500) String description,
    List<@Valid NodeRequest> nodes,
    List<@Valid EdgeRequest> edges,
    Map<String, Object> input,
    @Min(0) Long workflowTimeoutSeconds,
    @Pattern(
        regexp = "FAIL_FAST|CONTINUE_INDEPENDENT_BRANCHES|TERMINATE_ALL",
        message = "unsupported workflow failureStrategy")
    String failureStrategy) {

  public WorkflowDefinitionUpdateRequest {
    nodes = nodes == null ? List.of() : List.copyOf(nodes);
    edges = edges == null ? List.of() : List.copyOf(edges);
    input = input == null ? Map.of() : Map.copyOf(new LinkedHashMap<>(input));
    workflowTimeoutSeconds = workflowTimeoutSeconds == null ? 0L : workflowTimeoutSeconds;
    failureStrategy = failureStrategy == null || failureStrategy.isBlank()
        ? "CONTINUE_INDEPENDENT_BRANCHES"
        : failureStrategy;
  }

  public record NodeRequest(
      @NotBlank String id,
      @NotBlank String taskId,
      Double positionX,
      Double positionY,
      @Min(1) Integer maxAttempts,
      @Min(0) Long retryDelaySeconds,
      @Min(0) Long dispatchTimeoutSeconds,
      @Min(0) Long executionTimeoutSeconds,
      Map<String, String> inputMapping,
      @Pattern(
          regexp = "ALL_SUCCESS|ALL_DONE|NONE_FAILED|ONE_SUCCESS|ALWAYS",
          message = "unsupported triggerRule")
      String triggerRule,
      @Pattern(
          regexp = "FAIL_WORKFLOW|BLOCK_BRANCH|IGNORE_FAILURE",
          message = "unsupported failurePolicy")
      String failurePolicy) {

    public NodeRequest {
      positionX = positionX == null ? 0D : positionX;
      positionY = positionY == null ? 0D : positionY;
      maxAttempts = maxAttempts == null ? 1 : maxAttempts;
      retryDelaySeconds = retryDelaySeconds == null ? 0L : retryDelaySeconds;
      dispatchTimeoutSeconds = dispatchTimeoutSeconds == null ? 0L : dispatchTimeoutSeconds;
      executionTimeoutSeconds = executionTimeoutSeconds == null ? 0L : executionTimeoutSeconds;
      inputMapping = inputMapping == null
          ? Map.of()
          : Map.copyOf(new LinkedHashMap<>(inputMapping));
      triggerRule = triggerRule == null || triggerRule.isBlank()
          ? "ALL_SUCCESS"
          : triggerRule;
      failurePolicy = failurePolicy == null || failurePolicy.isBlank()
          ? "FAIL_WORKFLOW"
          : failurePolicy;
    }
  }

  public record EdgeRequest(
      @NotBlank String source,
      @NotBlank String target) {}
}
