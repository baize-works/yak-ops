package io.yak.ops.business.workflow.dag;

import io.yak.ops.business.workflow.model.WorkflowDag;
import io.yak.ops.core.workflow.WorkflowTaskExecutorRegistry;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/** Validates a workflow snapshot and compiles it into adjacency maps and topological order. */
public final class WorkflowDagCompiler {

  private static final Pattern NODE_KEY = Pattern.compile("[A-Za-z][A-Za-z0-9_-]{0,63}");

  private final WorkflowTaskExecutorRegistry executorRegistry;

  public WorkflowDagCompiler(WorkflowTaskExecutorRegistry executorRegistry) {
    this.executorRegistry = executorRegistry;
  }

  public CompiledWorkflowDag compile(WorkflowDag dag) {
    if (dag == null || dag.nodes().isEmpty()) {
      throw new IllegalArgumentException("Workflow DAG must contain at least one node");
    }

    Map<String, WorkflowDag.Node> nodes = new LinkedHashMap<>();
    Map<String, Set<String>> predecessors = new LinkedHashMap<>();
    Map<String, Set<String>> successors = new LinkedHashMap<>();

    for (WorkflowDag.Node source : dag.nodes()) {
      WorkflowDag.Node node = normalize(source);
      validateNode(node);
      if (nodes.putIfAbsent(node.key(), node) != null) {
        throw new IllegalArgumentException("Duplicate workflow node key: " + node.key());
      }
      predecessors.put(node.key(), new LinkedHashSet<>());
      successors.put(node.key(), new LinkedHashSet<>());
    }

    Set<String> uniqueEdges = new LinkedHashSet<>();
    for (WorkflowDag.Edge edge : dag.edges()) {
      if (edge == null || edge.from() == null || edge.to() == null) {
        throw new IllegalArgumentException("Workflow edge endpoints must not be null");
      }
      String from = edge.from().trim();
      String to = edge.to().trim();
      if (!nodes.containsKey(from) || !nodes.containsKey(to)) {
        throw new IllegalArgumentException("Workflow edge references an unknown node: " + from + " -> " + to);
      }
      if (from.equals(to)) {
        throw new IllegalArgumentException("Workflow node cannot depend on itself: " + from);
      }
      String edgeKey = from + "\u0000" + to;
      if (uniqueEdges.add(edgeKey)) {
        successors.get(from).add(to);
        predecessors.get(to).add(from);
      }
    }

    List<String> order = topologicalSort(predecessors, successors);
    return new CompiledWorkflowDag(
        Collections.unmodifiableMap(nodes),
        immutableSetMap(predecessors),
        immutableSetMap(successors),
        List.copyOf(order));
  }

  private WorkflowDag.Node normalize(WorkflowDag.Node source) {
    if (source == null) {
      throw new IllegalArgumentException("Workflow node must not be null");
    }
    String key = source.key() == null ? null : source.key().trim();
    String name = source.name() == null ? null : source.name().trim();
    String type = source.type() == null ? null : source.type().trim().toUpperCase(Locale.ROOT);
    return new WorkflowDag.Node(
        key,
        name,
        type,
        source.config(),
        source.retryTimes(),
        source.retryIntervalSeconds(),
        source.timeoutSeconds(),
        source.enabled(),
        source.idempotent(),
        source.retryOnRestart());
  }

  private void validateNode(WorkflowDag.Node node) {
    if (node.key() == null || !NODE_KEY.matcher(node.key()).matches()) {
      throw new IllegalArgumentException(
          "Workflow node key must match " + NODE_KEY.pattern() + ": " + node.key());
    }
    if (node.name() == null || node.name().isBlank()) {
      throw new IllegalArgumentException("Workflow node name must not be blank: " + node.key());
    }
    if (node.type() == null || node.type().isBlank()) {
      throw new IllegalArgumentException("Workflow task type must not be blank: " + node.key());
    }
    if (node.retryTimes() < 0 || node.retryIntervalSeconds() < 0 || node.timeoutSeconds() < 0) {
      throw new IllegalArgumentException("Retry and timeout values must not be negative: " + node.key());
    }
    if (!node.enabled()) {
      return;
    }
    executorRegistry.require(node.type()).validate(node.config());
  }

  private static List<String> topologicalSort(
      Map<String, Set<String>> predecessors,
      Map<String, Set<String>> successors) {
    Map<String, Integer> indegrees = new LinkedHashMap<>();
    predecessors.forEach((node, values) -> indegrees.put(node, values.size()));
    Deque<String> ready = new ArrayDeque<>();
    indegrees.forEach((node, degree) -> {
      if (degree == 0) {
        ready.addLast(node);
      }
    });

    List<String> result = new ArrayList<>(indegrees.size());
    while (!ready.isEmpty()) {
      String node = ready.removeFirst();
      result.add(node);
      for (String successor : successors.getOrDefault(node, Set.of())) {
        int remaining = indegrees.computeIfPresent(successor, (ignored, degree) -> degree - 1);
        if (remaining == 0) {
          ready.addLast(successor);
        }
      }
    }
    if (result.size() != indegrees.size()) {
      List<String> cyclicNodes = indegrees.entrySet().stream()
          .filter(entry -> entry.getValue() > 0)
          .map(Map.Entry::getKey)
          .toList();
      throw new IllegalArgumentException("Workflow DAG contains a cycle: " + cyclicNodes);
    }
    return result;
  }

  private static Map<String, Set<String>> immutableSetMap(Map<String, Set<String>> source) {
    Map<String, Set<String>> copy = new LinkedHashMap<>();
    source.forEach((key, value) -> copy.put(key, Collections.unmodifiableSet(new LinkedHashSet<>(value))));
    return Collections.unmodifiableMap(copy);
  }
}
