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
    @Min(0) Long workflowTimeoutSeconds) {

  public WorkflowRunRequest {
    edges = edges == null ? List.of() : List.copyOf(edges);
    input = input == null ? Map.of() : Map.copyOf(new LinkedHashMap<>(input));
    workflowTimeoutSeconds = workflowTimeoutSeconds == null ? 0L : workflowTimeoutSeconds;
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
      @NotBlank String name,
      @NotBlank String type,
      @Pattern(regexp = "SUCCESS|FAILED", message = "mockResult must be SUCCESS or FAILED")
      String mockResult,
      @Min(1) Integer maxAttempts,
      @Min(0) Long retryDelaySeconds,
      @Min(0) Long dispatchTimeoutSeconds,
      @Min(0) Long executionTimeoutSeconds,
      Map<String, String> inputMapping) {

    public NodeRequest {
      mockResult = mockResult == null || mockResult.isBlank() ? "SUCCESS" : mockResult;
      maxAttempts = maxAttempts == null ? 1 : maxAttempts;
      retryDelaySeconds = retryDelaySeconds == null ? 0L : retryDelaySeconds;
      dispatchTimeoutSeconds = dispatchTimeoutSeconds == null ? 0L : dispatchTimeoutSeconds;
      executionTimeoutSeconds = executionTimeoutSeconds == null ? 0L : executionTimeoutSeconds;
      inputMapping = inputMapping == null
          ? Map.of()
          : Map.copyOf(new LinkedHashMap<>(inputMapping));
    }

    public NodeRequest(String id, String name, String type, String mockResult) {
      this(id, name, type, mockResult, 1, 0L, 0L, 0L, Map.of());
    }

    public NodeRequest(String id, String name, String type) {
      this(id, name, type, "SUCCESS");
    }
  }

  public record EdgeRequest(
      @NotBlank String source,
      @NotBlank String target) {}
}
