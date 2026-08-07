package io.yak.ops.business.workflow.model;

import jakarta.validation.Valid;
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
    Map<String, Object> input) {

  public WorkflowRunRequest {
    edges = edges == null ? List.of() : List.copyOf(edges);
    input = input == null ? Map.of() : Map.copyOf(new LinkedHashMap<>(input));
  }

  public record NodeRequest(
      @NotBlank String id,
      @NotBlank String name,
      @NotBlank String type,
      @Pattern(regexp = "SUCCESS|FAILED", message = "mockResult must be SUCCESS or FAILED")
      String mockResult) {

    public NodeRequest {
      mockResult = mockResult == null || mockResult.isBlank() ? "SUCCESS" : mockResult;
    }

    public NodeRequest(String id, String name, String type) {
      this(id, name, type, "SUCCESS");
    }
  }

  public record EdgeRequest(
      @NotBlank String source,
      @NotBlank String target) {}
}
