package io.yak.ops.business.workflow.dag;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.workflow.config.ConditionalOnWorkflowEnabled;
import io.yak.ops.common.bean.entity.workflow.v2.WorkflowV2BindingSource;
import io.yak.ops.common.bean.entity.workflow.v2.WorkflowV2Dag;
import io.yak.ops.common.bean.entity.workflow.v2.WorkflowV2Edge;
import io.yak.ops.common.bean.entity.workflow.v2.WorkflowV2ExecutionPolicy;
import io.yak.ops.common.bean.entity.workflow.v2.WorkflowV2InputBinding;
import io.yak.ops.common.bean.entity.workflow.v2.WorkflowV2Node;
import io.yak.ops.common.bean.entity.workflow.v2.WorkflowV2TaskReference;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/** Normalizes and validates the orchestration-only Workflow V2 DAG contract. */
@ConditionalOnWorkflowEnabled
@Component
public final class WorkflowV2DagValidator {

  private static final Pattern NODE_KEY = Pattern.compile("[A-Za-z][A-Za-z0-9_-]{0,63}");

  private final ObjectMapper objectMapper;

  public WorkflowV2DagValidator(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public WorkflowV2Dag normalizeAndValidate(WorkflowV2Dag source) {
    if (source == null) {
      throw new IllegalArgumentException("Workflow V2 DAG 不能为空");
    }
    WorkflowV2Dag dag = objectMapper.convertValue(
        objectMapper.valueToTree(source), WorkflowV2Dag.class);
    if (dag.getSchemaVersion() != WorkflowV2Dag.SCHEMA_VERSION) {
      throw new IllegalArgumentException("Workflow V2 schemaVersion 必须为 2");
    }
    if (dag.getNodes().isEmpty()) {
      throw new IllegalArgumentException("Workflow V2 至少需要一个节点");
    }

    Map<String, WorkflowV2Node> nodes = new LinkedHashMap<>();
    int startCount = 0;
    int endCount = 0;
    for (WorkflowV2Node node : dag.getNodes()) {
      normalizeNode(node);
      validateNode(node);
      if (nodes.putIfAbsent(node.getKey(), node) != null) {
        throw new IllegalArgumentException("Workflow V2 节点编码重复：" + node.getKey());
      }
      if (node.getKind() == WorkflowV2Node.Kind.START) startCount++;
      if (node.getKind() == WorkflowV2Node.Kind.END) endCount++;
    }
    if (startCount != 1) {
      throw new IllegalArgumentException("Workflow V2 必须且只能包含一个 START 节点");
    }
    if (endCount < 1) {
      throw new IllegalArgumentException("Workflow V2 至少需要一个 END 节点");
    }

    Map<String, Set<String>> predecessors = new LinkedHashMap<>();
    Map<String, Set<String>> successors = new LinkedHashMap<>();
    nodes.keySet().forEach(key -> {
      predecessors.put(key, new LinkedHashSet<>());
      successors.put(key, new LinkedHashSet<>());
    });

    Set<String> edgeKeys = new LinkedHashSet<>();
    List<WorkflowV2Edge> normalizedEdges = new ArrayList<>();
    for (WorkflowV2Edge edge : dag.getEdges()) {
      if (edge == null) {
        throw new IllegalArgumentException("Workflow V2 连线不能为空");
      }
      edge.setFrom(trim(edge.getFrom()));
      edge.setTo(trim(edge.getTo()));
      if (!nodes.containsKey(edge.getFrom()) || !nodes.containsKey(edge.getTo())) {
        throw new IllegalArgumentException(
            "Workflow V2 连线引用了不存在的节点：" + edge.getFrom() + " -> " + edge.getTo());
      }
      if (edge.getFrom().equals(edge.getTo())) {
        throw new IllegalArgumentException("Workflow V2 节点不能连接自身：" + edge.getFrom());
      }
      WorkflowV2Node from = nodes.get(edge.getFrom());
      WorkflowV2Node to = nodes.get(edge.getTo());
      if (from.getKind() == WorkflowV2Node.Kind.END) {
        throw new IllegalArgumentException("END 节点不能连接下游：" + from.getKey());
      }
      if (to.getKind() == WorkflowV2Node.Kind.START) {
        throw new IllegalArgumentException("START 节点不能存在上游：" + to.getKey());
      }
      if (edge.getFromPort() == WorkflowV2Edge.Port.FAILURE
          && from.getKind() != WorkflowV2Node.Kind.TASK) {
        throw new IllegalArgumentException("FAILURE 出口只能由 TASK 节点产生：" + from.getKey());
      }
      String edgeKey = edge.getFrom() + '\u0000' + edge.getFromPort() + '\u0000' + edge.getTo();
      if (edgeKeys.add(edgeKey)) {
        normalizedEdges.add(edge);
        predecessors.get(edge.getTo()).add(edge.getFrom());
        successors.get(edge.getFrom()).add(edge.getTo());
      }
    }
    dag.setEdges(normalizedEdges);

    List<String> topologicalOrder = topologicalSort(predecessors, successors);
    validateFailureRoutes(nodes, normalizedEdges);
    validateBindings(nodes, predecessors, topologicalOrder);
    return dag;
  }

  private static void normalizeNode(WorkflowV2Node node) {
    if (node == null) {
      throw new IllegalArgumentException("Workflow V2 节点不能为空");
    }
    node.setKey(trim(node.getKey()));
    node.setName(trim(node.getName()));
    if (node.getTaskRef() != null) {
      WorkflowV2TaskReference ref = node.getTaskRef();
      ref.setTaskId(trim(ref.getTaskId()));
      ref.setTaskVersionId(trim(ref.getTaskVersionId()));
      ref.setTaskType(upper(ref.getTaskType()));
    }
    for (WorkflowV2InputBinding binding : node.getInputBindings()) {
      if (binding != null) {
        binding.setTarget(trim(binding.getTarget()));
        normalizeSource(binding.getSource());
      }
    }
    node.getOutputBindings().forEach((ignored, value) -> normalizeSource(value));
  }

  private static void normalizeSource(WorkflowV2BindingSource source) {
    if (source == null) return;
    source.setNodeKey(trim(source.getNodeKey()));
    source.setPath(trim(source.getPath()));
    source.setVariableName(trim(source.getVariableName()));
  }

  private static void validateNode(WorkflowV2Node node) {
    if (node.getKey() == null || !NODE_KEY.matcher(node.getKey()).matches()) {
      throw new IllegalArgumentException(
          "Workflow V2 节点编码必须匹配 " + NODE_KEY.pattern() + "：" + node.getKey());
    }
    if (node.getName() == null) {
      throw new IllegalArgumentException("Workflow V2 节点名称不能为空：" + node.getKey());
    }
    if (node.getKind() == null) {
      throw new IllegalArgumentException("Workflow V2 节点类型不能为空：" + node.getKey());
    }
    if (node.getKind() == WorkflowV2Node.Kind.TASK) {
      validateTaskReference(node);
    } else if (node.getTaskRef() != null) {
      throw new IllegalArgumentException(node.getKind() + " 节点不能包含 taskRef：" + node.getKey());
    }
    WorkflowV2ExecutionPolicy policy = node.getExecutionPolicy();
    if (policy.getTimeoutSeconds() < 0
        || policy.getRetryTimes() < 0
        || policy.getRetryIntervalSeconds() < 0) {
      throw new IllegalArgumentException("Workflow V2 重试和超时不能为负数：" + node.getKey());
    }
  }

  private static void validateTaskReference(WorkflowV2Node node) {
    WorkflowV2TaskReference ref = node.getTaskRef();
    if (ref == null) {
      throw new IllegalArgumentException("TASK 节点必须绑定 taskRef：" + node.getKey());
    }
    positiveId(ref.getTaskId(), "taskId", node.getKey());
    positiveId(ref.getTaskVersionId(), "taskVersionId", node.getKey());
    if (ref.getTaskVersionNumber() <= 0) {
      throw new IllegalArgumentException("taskVersionNumber 必须为正整数：" + node.getKey());
    }
    if (ref.getTaskType() == null) {
      throw new IllegalArgumentException("taskType 不能为空：" + node.getKey());
    }
  }

  private static void validateFailureRoutes(
      Map<String, WorkflowV2Node> nodes,
      List<WorkflowV2Edge> edges) {
    Set<String> failureSources = new LinkedHashSet<>();
    edges.stream()
        .filter(edge -> edge.getFromPort() == WorkflowV2Edge.Port.FAILURE)
        .forEach(edge -> failureSources.add(edge.getFrom()));
    nodes.values().stream()
        .filter(node -> node.getKind() == WorkflowV2Node.Kind.TASK)
        .filter(node -> node.getExecutionPolicy().getFailureAction()
            == WorkflowV2ExecutionPolicy.FailureAction.ROUTE_FAILURE)
        .filter(node -> !failureSources.contains(node.getKey()))
        .findFirst()
        .ifPresent(node -> {
          throw new IllegalArgumentException(
              "失败策略为 ROUTE_FAILURE 时必须配置 FAILURE 连线：" + node.getKey());
        });
  }

  private static void validateBindings(
      Map<String, WorkflowV2Node> nodes,
      Map<String, Set<String>> predecessors,
      List<String> topologicalOrder) {
    Map<String, Set<String>> ancestors = new LinkedHashMap<>();
    for (String nodeKey : topologicalOrder) {
      Set<String> values = new LinkedHashSet<>();
      for (String predecessor : predecessors.get(nodeKey)) {
        values.add(predecessor);
        values.addAll(ancestors.getOrDefault(predecessor, Set.of()));
      }
      ancestors.put(nodeKey, values);
    }

    for (WorkflowV2Node node : nodes.values()) {
      Set<String> targets = new LinkedHashSet<>();
      for (WorkflowV2InputBinding binding : node.getInputBindings()) {
        if (binding == null || binding.getTarget() == null || binding.getSource() == null) {
          throw new IllegalArgumentException("输入映射不完整：" + node.getKey());
        }
        if (!targets.add(binding.getTarget())) {
          throw new IllegalArgumentException(
              "输入映射目标重复：" + node.getKey() + "/" + binding.getTarget());
        }
        validateBindingSource(node, binding.getSource(), nodes, ancestors);
      }
      for (Map.Entry<String, WorkflowV2BindingSource> entry : node.getOutputBindings().entrySet()) {
        if (trim(entry.getKey()) == null || entry.getValue() == null) {
          throw new IllegalArgumentException("输出映射不完整：" + node.getKey());
        }
        validateBindingSource(node, entry.getValue(), nodes, ancestors);
      }
    }
  }

  private static void validateBindingSource(
      WorkflowV2Node owner,
      WorkflowV2BindingSource source,
      Map<String, WorkflowV2Node> nodes,
      Map<String, Set<String>> ancestors) {
    if (source.getType() == null) {
      throw new IllegalArgumentException("映射来源类型不能为空：" + owner.getKey());
    }
    switch (source.getType()) {
      case START_INPUT -> requireText(source.getPath(), "START_INPUT path", owner.getKey());
      case WORKFLOW_VARIABLE -> requireText(
          source.getVariableName(), "WORKFLOW_VARIABLE variableName", owner.getKey());
      case LITERAL -> { }
      case NODE_OUTPUT -> {
        requireText(source.getNodeKey(), "NODE_OUTPUT nodeKey", owner.getKey());
        requireText(source.getPath(), "NODE_OUTPUT path", owner.getKey());
        if (!nodes.containsKey(source.getNodeKey())) {
          throw new IllegalArgumentException(
              "NODE_OUTPUT 引用了不存在的节点：" + source.getNodeKey());
        }
        if (!ancestors.getOrDefault(owner.getKey(), Set.of()).contains(source.getNodeKey())) {
          throw new IllegalArgumentException(
              "NODE_OUTPUT 只能引用拓扑上游节点：" + owner.getKey() + " <- " + source.getNodeKey());
        }
      }
    }
  }

  private static List<String> topologicalSort(
      Map<String, Set<String>> predecessors,
      Map<String, Set<String>> successors) {
    Map<String, Integer> indegrees = new LinkedHashMap<>();
    predecessors.forEach((key, value) -> indegrees.put(key, value.size()));
    Deque<String> ready = new ArrayDeque<>();
    indegrees.forEach((key, value) -> {
      if (value == 0) ready.addLast(key);
    });
    List<String> result = new ArrayList<>();
    while (!ready.isEmpty()) {
      String key = ready.removeFirst();
      result.add(key);
      for (String successor : successors.getOrDefault(key, Set.of())) {
        int value = indegrees.computeIfPresent(successor, (ignored, current) -> current - 1);
        if (value == 0) ready.addLast(successor);
      }
    }
    if (result.size() != predecessors.size()) {
      throw new IllegalArgumentException("Workflow V2 DAG 存在环");
    }
    return result;
  }

  private static long positiveId(String value, String field, String nodeKey) {
    try {
      long result = Long.parseLong(value);
      if (result <= 0L) throw new NumberFormatException();
      return result;
    } catch (NumberFormatException exception) {
      throw new IllegalArgumentException(field + " 必须是正整数：" + nodeKey);
    }
  }

  private static void requireText(String value, String field, String nodeKey) {
    if (trim(value) == null) {
      throw new IllegalArgumentException(field + " 不能为空：" + nodeKey);
    }
  }

  private static String trim(String value) {
    if (value == null) return null;
    String text = value.trim();
    return text.isEmpty() ? null : text;
  }

  private static String upper(String value) {
    String text = trim(value);
    return text == null ? null : text.toUpperCase(Locale.ROOT);
  }
}
