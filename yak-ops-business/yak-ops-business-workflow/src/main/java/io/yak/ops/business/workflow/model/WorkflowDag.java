package io.yak.ops.business.workflow.model;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Serializable workflow DAG snapshot stored in each published version. */
public final class WorkflowDag {

  private List<Node> nodes = List.of();
  private List<Edge> edges = List.of();

  public WorkflowDag() {
  }

  public WorkflowDag(List<Node> nodes, List<Edge> edges) {
    setNodes(nodes);
    setEdges(edges);
  }

  public List<Node> nodes() {
    return nodes;
  }

  public List<Node> getNodes() {
    return nodes;
  }

  public void setNodes(List<Node> nodes) {
    this.nodes = nodes == null ? List.of() : List.copyOf(nodes);
  }

  public List<Edge> edges() {
    return edges;
  }

  public List<Edge> getEdges() {
    return edges;
  }

  public void setEdges(List<Edge> edges) {
    this.edges = edges == null ? List.of() : List.copyOf(edges);
  }

  @Override
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof WorkflowDag)) {
      return false;
    }
    WorkflowDag that = (WorkflowDag) other;
    return Objects.equals(nodes, that.nodes) && Objects.equals(edges, that.edges);
  }

  @Override
  public int hashCode() {
    return Objects.hash(nodes, edges);
  }

  @Override
  public String toString() {
    return "WorkflowDag{nodes=" + nodes + ", edges=" + edges + '}';
  }

  public static final class Node {

    private String key;
    private String name;
    private String type;
    private Map<String, Object> config = Map.of();
    private int retryTimes;
    private int retryIntervalSeconds;
    private int timeoutSeconds;
    private boolean enabled;
    private boolean idempotent;
    private boolean retryOnRestart;

    public Node() {
    }

    public Node(
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
      this.key = key;
      this.name = name;
      this.type = type;
      setConfig(config);
      this.retryTimes = retryTimes;
      this.retryIntervalSeconds = retryIntervalSeconds;
      this.timeoutSeconds = timeoutSeconds;
      this.enabled = enabled;
      this.idempotent = idempotent;
      this.retryOnRestart = retryOnRestart;
    }

    public String key() {
      return key;
    }

    public String getKey() {
      return key;
    }

    public void setKey(String key) {
      this.key = key;
    }

    public String name() {
      return name;
    }

    public String getName() {
      return name;
    }

    public void setName(String name) {
      this.name = name;
    }

    public String type() {
      return type;
    }

    public String getType() {
      return type;
    }

    public void setType(String type) {
      this.type = type;
    }

    public Map<String, Object> config() {
      return config;
    }

    public Map<String, Object> getConfig() {
      return config;
    }

    public void setConfig(Map<String, Object> config) {
      this.config = immutableMap(config);
    }

    public int retryTimes() {
      return retryTimes;
    }

    public int getRetryTimes() {
      return retryTimes;
    }

    public void setRetryTimes(int retryTimes) {
      this.retryTimes = retryTimes;
    }

    public int retryIntervalSeconds() {
      return retryIntervalSeconds;
    }

    public int getRetryIntervalSeconds() {
      return retryIntervalSeconds;
    }

    public void setRetryIntervalSeconds(int retryIntervalSeconds) {
      this.retryIntervalSeconds = retryIntervalSeconds;
    }

    public int timeoutSeconds() {
      return timeoutSeconds;
    }

    public int getTimeoutSeconds() {
      return timeoutSeconds;
    }

    public void setTimeoutSeconds(int timeoutSeconds) {
      this.timeoutSeconds = timeoutSeconds;
    }

    public boolean enabled() {
      return enabled;
    }

    public boolean isEnabled() {
      return enabled;
    }

    public void setEnabled(boolean enabled) {
      this.enabled = enabled;
    }

    public boolean idempotent() {
      return idempotent;
    }

    public boolean isIdempotent() {
      return idempotent;
    }

    public void setIdempotent(boolean idempotent) {
      this.idempotent = idempotent;
    }

    public boolean retryOnRestart() {
      return retryOnRestart;
    }

    public boolean isRetryOnRestart() {
      return retryOnRestart;
    }

    public void setRetryOnRestart(boolean retryOnRestart) {
      this.retryOnRestart = retryOnRestart;
    }

    @Override
    public boolean equals(Object other) {
      if (this == other) {
        return true;
      }
      if (!(other instanceof Node)) {
        return false;
      }
      Node that = (Node) other;
      return retryTimes == that.retryTimes
          && retryIntervalSeconds == that.retryIntervalSeconds
          && timeoutSeconds == that.timeoutSeconds
          && enabled == that.enabled
          && idempotent == that.idempotent
          && retryOnRestart == that.retryOnRestart
          && Objects.equals(key, that.key)
          && Objects.equals(name, that.name)
          && Objects.equals(type, that.type)
          && Objects.equals(config, that.config);
    }

    @Override
    public int hashCode() {
      return Objects.hash(
          key,
          name,
          type,
          config,
          retryTimes,
          retryIntervalSeconds,
          timeoutSeconds,
          enabled,
          idempotent,
          retryOnRestart);
    }

    @Override
    public String toString() {
      return "Node{"
          + "key='" + key + '\''
          + ", name='" + name + '\''
          + ", type='" + type + '\''
          + ", config=" + config
          + ", retryTimes=" + retryTimes
          + ", retryIntervalSeconds=" + retryIntervalSeconds
          + ", timeoutSeconds=" + timeoutSeconds
          + ", enabled=" + enabled
          + ", idempotent=" + idempotent
          + ", retryOnRestart=" + retryOnRestart
          + '}';
    }
  }

  public static final class Edge {

    private String from;
    private String to;

    public Edge() {
    }

    public Edge(String from, String to) {
      this.from = from;
      this.to = to;
    }

    public String from() {
      return from;
    }

    public String getFrom() {
      return from;
    }

    public void setFrom(String from) {
      this.from = from;
    }

    public String to() {
      return to;
    }

    public String getTo() {
      return to;
    }

    public void setTo(String to) {
      this.to = to;
    }

    @Override
    public boolean equals(Object other) {
      if (this == other) {
        return true;
      }
      if (!(other instanceof Edge)) {
        return false;
      }
      Edge that = (Edge) other;
      return Objects.equals(from, that.from) && Objects.equals(to, that.to);
    }

    @Override
    public int hashCode() {
      return Objects.hash(from, to);
    }

    @Override
    public String toString() {
      return "Edge{from='" + from + "', to='" + to + "'}";
    }
  }

  private static Map<String, Object> immutableMap(Map<String, Object> source) {
    if (source == null || source.isEmpty()) {
      return Map.of();
    }
    return Collections.unmodifiableMap(new LinkedHashMap<>(source));
  }
}
