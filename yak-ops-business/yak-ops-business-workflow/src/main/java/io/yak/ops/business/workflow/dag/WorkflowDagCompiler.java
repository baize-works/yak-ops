package io.yak.ops.business.workflow.dag;

import io.yak.ops.common.bean.entity.workflow.WorkflowDag;
import io.yak.ops.common.bean.entity.workflow.WorkflowEdge;
import io.yak.ops.common.bean.entity.workflow.WorkflowNode;
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
import java.util.stream.Collectors;

/** 校验 DAG 并生成前驱、后继及拓扑顺序。 */
public class WorkflowDagCompiler {

  private static final Pattern NODE_KEY = Pattern.compile("[A-Za-z][A-Za-z0-9_-]{0,63}");

  private final WorkflowTaskExecutorRegistry executorRegistry;

  public WorkflowDagCompiler(WorkflowTaskExecutorRegistry executorRegistry) {
    this.executorRegistry = executorRegistry;
  }

  public CompiledWorkflowDag compile(WorkflowDag dag) {
    if (dag == null || dag.getNodes() == null || dag.getNodes().isEmpty()) {
      throw new IllegalArgumentException("工作流 DAG 至少需要一个节点");
    }

    Map<String, WorkflowNode> nodes = new LinkedHashMap<>();
    Map<String, Set<String>> predecessors = new LinkedHashMap<>();
    Map<String, Set<String>> successors = new LinkedHashMap<>();

    for (WorkflowNode source : dag.getNodes()) {
      WorkflowNode node = normalize(source);
      validateNode(node);
      if (nodes.putIfAbsent(node.getKey(), node) != null) {
        throw new IllegalArgumentException("工作流节点编码重复：" + node.getKey());
      }
      predecessors.put(node.getKey(), new LinkedHashSet<>());
      successors.put(node.getKey(), new LinkedHashSet<>());
    }

    Set<String> uniqueEdges = new LinkedHashSet<>();
    for (WorkflowEdge edge : dag.getEdges()) {
      if (edge == null || edge.getFrom() == null || edge.getTo() == null) {
        throw new IllegalArgumentException("工作流边的起止节点不能为空");
      }
      String from = edge.getFrom().trim();
      String to = edge.getTo().trim();
      if (!nodes.containsKey(from) || !nodes.containsKey(to)) {
        throw new IllegalArgumentException("工作流边引用了不存在的节点：" + from + " -> " + to);
      }
      if (from.equals(to)) {
        throw new IllegalArgumentException("工作流节点不能依赖自身：" + from);
      }
      String edgeKey = from + "\u0000" + to;
      if (uniqueEdges.add(edgeKey)) {
        successors.get(from).add(to);
        predecessors.get(to).add(from);
      }
    }

    List<String> order = topologicalSort(predecessors, successors);
    return new CompiledWorkflowDag(
        nodes,
        immutableSetMap(predecessors),
        immutableSetMap(successors),
        order);
  }

  private WorkflowNode normalize(WorkflowNode source) {
    if (source == null) {
      throw new IllegalArgumentException("工作流节点不能为空");
    }
    WorkflowNode target = new WorkflowNode();
    target.setKey(source.getKey() == null ? null : source.getKey().trim());
    target.setName(source.getName() == null ? null : source.getName().trim());
    target.setType(source.getType() == null
        ? null
        : source.getType().trim().toUpperCase(Locale.ROOT));
    target.setConfig(source.getConfig());
    target.setRetryTimes(source.getRetryTimes());
    target.setRetryIntervalSeconds(source.getRetryIntervalSeconds());
    target.setTimeoutSeconds(source.getTimeoutSeconds());
    target.setEnabled(source.isEnabled());
    target.setIdempotent(source.isIdempotent());
    target.setRetryOnRestart(source.isRetryOnRestart());
    return target;
  }

  private void validateNode(WorkflowNode node) {
    if (node.getKey() == null || !NODE_KEY.matcher(node.getKey()).matches()) {
      throw new IllegalArgumentException(
          "工作流节点编码必须匹配 " + NODE_KEY.pattern() + "：" + node.getKey());
    }
    if (node.getName() == null || node.getName().isBlank()) {
      throw new IllegalArgumentException("工作流节点名称不能为空：" + node.getKey());
    }
    if (node.getType() == null || node.getType().isBlank()) {
      throw new IllegalArgumentException("工作流任务类型不能为空：" + node.getKey());
    }
    if (node.getRetryTimes() < 0
        || node.getRetryIntervalSeconds() < 0
        || node.getTimeoutSeconds() < 0) {
      throw new IllegalArgumentException("重试和超时时间不能为负数：" + node.getKey());
    }
    if (node.isEnabled()) {
      executorRegistry.require(node.getType()).validate(node.getConfig());
    }
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
          .collect(Collectors.toList());
      throw new IllegalArgumentException("工作流 DAG 存在环：" + cyclicNodes);
    }
    return result;
  }

  private static Map<String, Set<String>> immutableSetMap(Map<String, Set<String>> source) {
    Map<String, Set<String>> copy = new LinkedHashMap<>();
    source.forEach((key, value) ->
        copy.put(key, Collections.unmodifiableSet(new LinkedHashSet<>(value))));
    return Collections.unmodifiableMap(copy);
  }
}
