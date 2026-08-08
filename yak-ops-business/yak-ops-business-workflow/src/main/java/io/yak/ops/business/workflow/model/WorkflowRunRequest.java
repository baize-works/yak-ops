package io.yak.ops.business.workflow.model;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public record WorkflowRunRequest(
    @NotBlank String name,
    @NotEmpty List<@Valid NodeRequest> nodes,
    List<@Valid EdgeRequest> edges,
    Map<String, Object> input,
    @Min(0) Long workflowTimeoutSeconds,
    @Pattern(
        regexp = "FAIL_FAST|CONTINUE_INDEPENDENT_BRANCHES|TERMINATE_ALL",
        message = "unsupported workflow failureStrategy")
    String failureStrategy) {

  public WorkflowRunRequest {
    edges = edges == null ? List.of() : List.copyOf(edges);
    input = input == null ? Map.of() : Map.copyOf(new LinkedHashMap<>(input));
    workflowTimeoutSeconds = workflowTimeoutSeconds == null ? 0L : workflowTimeoutSeconds;
    failureStrategy = failureStrategy == null || failureStrategy.isBlank()
        ? "CONTINUE_INDEPENDENT_BRANCHES"
        : failureStrategy;
  }

  public WorkflowRunRequest(
      String name,
      List<NodeRequest> nodes,
      List<EdgeRequest> edges,
      Map<String, Object> input,
      Long workflowTimeoutSeconds) {
    this(
        name,
        nodes,
        edges,
        input,
        workflowTimeoutSeconds,
        "CONTINUE_INDEPENDENT_BRANCHES");
  }

  public WorkflowRunRequest(
      String name,
      List<NodeRequest> nodes,
      List<EdgeRequest> edges,
      Map<String, Object> input) {
    this(name, nodes, edges, input, 0L);
  }

  public record NodeRequest(
      @NotBlank String id,
      @NotBlank String taskId,
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

    public NodeRequest(
        String id,
        String taskId,
        Integer maxAttempts,
        Long retryDelaySeconds,
        Long dispatchTimeoutSeconds,
        Long executionTimeoutSeconds,
        Map<String, String> inputMapping) {
      this(
          id,
          taskId,
          maxAttempts,
          retryDelaySeconds,
          dispatchTimeoutSeconds,
          executionTimeoutSeconds,
          inputMapping,
          "ALL_SUCCESS",
          "FAIL_WORKFLOW");
    }

    public NodeRequest(String id, String taskId) {
      this(id, taskId, 1, 0L, 0L, 0L, Map.of());
    }
  }

  public record EdgeRequest(
      @NotBlank String source,
      @NotBlank String target) {}
}
