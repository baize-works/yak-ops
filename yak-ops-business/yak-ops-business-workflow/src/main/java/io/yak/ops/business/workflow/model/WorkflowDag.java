package io.yak.ops.business.workflow.model;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Serializable workflow DAG snapshot stored in each published version. */
public record WorkflowDag(List<Node> nodes, List<Edge> edges) {

  public WorkflowDag {
    nodes = nodes == null ? List.of() : List.copyOf(nodes);
    edges = edges == null ? List.of() : List.copyOf(edges);
  }

  public record Node(
      String key,
      String name,
      String type,
      Map<String, Object> config,
      int retryTimes,
      int retryIntervalSeconds,
      int timeoutSeconds,
      boolean enabled,
      boolean idempotent,
      boolean retryOnRestart) {

    public Node {
      config = config == null || config.isEmpty()
          ? Map.of()
          : Collections.unmodifiableMap(new LinkedHashMap<>(config));
    }
  }

  public record Edge(String from, String to) {
  }
}
