package io.yak.ops.business.workflow.service;

import io.yak.ops.business.job.task.TaskRegistry;
import io.yak.ops.business.workflow.model.WorkflowDefinitionCreateRequest;
import io.yak.ops.business.workflow.model.WorkflowDefinitionUpdateRequest;
import io.yak.ops.business.workflow.model.WorkflowDefinitionUpdateRequest.EdgeRequest;
import io.yak.ops.business.workflow.model.WorkflowDefinitionUpdateRequest.NodeRequest;
import io.yak.ops.business.workflow.model.WorkflowDefinitionVO;
import io.yak.ops.business.workflow.model.WorkflowInstanceVO;
import io.yak.ops.business.workflow.model.WorkflowRunRequest;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * 第一阶段工作流定义管理。
 *
 * <p>定义仅保存在当前 Yak Ops 进程内存中，不新增数据库表；运行时继续复用
 * {@link WorkflowRuntimeService} 和 Yak Framework workflow engine。</p>
 */
@Service
public class WorkflowDefinitionService {

  private static final Set<String> ACTIVE_EXECUTION_STATUSES = Set.of(
      "CREATED", "WAITING", "READY", "SUBMITTED", "RUNNING", "PAUSING", "PAUSED", "RESUMING");

  private final WorkflowRuntimeService runtimeService;
  private final TaskRegistry taskRegistry;
  private final ConcurrentMap<String, DefinitionState> definitions = new ConcurrentHashMap<>();

  public WorkflowDefinitionService(
      WorkflowRuntimeService runtimeService,
      TaskRegistry taskRegistry) {
    this.runtimeService = runtimeService;
    this.taskRegistry = taskRegistry;
  }

  public List<WorkflowDefinitionVO> list(String keyword, String status) {
    String normalizedKeyword = normalize(keyword);
    String normalizedStatus = normalizeUpper(status);
    return definitions.values().stream()
        .filter(state -> normalizedKeyword == null
            || state.name.toLowerCase(Locale.ROOT).contains(normalizedKeyword)
            || text(state.description).toLowerCase(Locale.ROOT).contains(normalizedKeyword))
        .filter(state -> normalizedStatus == null || normalizedStatus.equals(state.status))
        .sorted(Comparator.comparing((DefinitionState state) -> state.updateTime).reversed())
        .map(this::toView)
        .toList();
  }

  public WorkflowDefinitionVO create(WorkflowDefinitionCreateRequest request) {
    if (request == null) {
      throw new IllegalArgumentException("工作流创建参数不能为空");
    }
    String name = required(request.name(), "工作流名称不能为空");
    Instant now = Instant.now();
    DefinitionState state = new DefinitionState();
    state.id = "workflow-" + UUID.randomUUID();
    state.name = name;
    state.description = trim(request.description());
    state.status = "DRAFT";
    state.nodes = List.of();
    state.edges = List.of();
    state.input = Map.of();
    state.workflowTimeoutSeconds = 0L;
    state.failureStrategy = "CONTINUE_INDEPENDENT_BRANCHES";
    state.createTime = now;
    state.updateTime = now;
    definitions.put(state.id, state);
    return toView(state);
  }

  public WorkflowDefinitionVO get(String id) {
    return toView(require(id));
  }

  public WorkflowDefinitionVO update(
      String id,
      WorkflowDefinitionUpdateRequest request) {
    if (request == null) {
      throw new IllegalArgumentException("工作流配置不能为空");
    }
    DefinitionState state = require(id);
    synchronized (state) {
      if ("ONLINE".equals(state.status)) {
        throw new IllegalStateException("已上线工作流请先下线后再修改配置");
      }
      state.name = required(request.name(), "工作流名称不能为空");
      state.description = trim(request.description());
      state.nodes = List.copyOf(request.nodes());
      state.edges = List.copyOf(request.edges());
      state.input = Map.copyOf(new LinkedHashMap<>(request.input()));
      state.workflowTimeoutSeconds = request.workflowTimeoutSeconds();
      state.failureStrategy = request.failureStrategy();
      state.updateTime = Instant.now();
      return toView(state);
    }
  }

  public WorkflowDefinitionVO online(String id) {
    DefinitionState state = require(id);
    synchronized (state) {
      validateForOnline(state);
      state.status = "ONLINE";
      state.updateTime = Instant.now();
      return toView(state);
    }
  }

  public WorkflowDefinitionVO offline(String id) {
    DefinitionState state = require(id);
    synchronized (state) {
      refreshLatestStatus(state);
      if (isActive(state.latestExecutionStatus)) {
        throw new IllegalStateException("工作流仍有运行中的执行，请先暂停或等待执行结束");
      }
      state.status = "OFFLINE";
      state.updateTime = Instant.now();
      return toView(state);
    }
  }

  public WorkflowDefinitionVO run(String id) {
    DefinitionState state = require(id);
    synchronized (state) {
      if (!"ONLINE".equals(state.status)) {
        throw new IllegalStateException("工作流未上线，不能执行");
      }
      refreshLatestStatus(state);
      if (isActive(state.latestExecutionStatus)) {
        throw new IllegalStateException("工作流已有运行中的执行实例");
      }
      WorkflowInstanceVO prepared = runtimeService.run(toRunRequest(state));
      WorkflowInstanceVO activated = runtimeService.activate(prepared.id());
      state.latestExecutionId = activated.id();
      state.latestExecutionStatus = activated.status();
      state.updateTime = Instant.now();
      return toView(state);
    }
  }

  public WorkflowDefinitionVO pause(String id) {
    DefinitionState state = require(id);
    synchronized (state) {
      String executionId = requireLatestExecution(state);
      WorkflowInstanceVO instance = runtimeService.pause(executionId);
      state.latestExecutionStatus = instance.status();
      state.updateTime = Instant.now();
      return toView(state);
    }
  }

  public WorkflowDefinitionVO resume(String id) {
    DefinitionState state = require(id);
    synchronized (state) {
      String executionId = requireLatestExecution(state);
      WorkflowInstanceVO instance = runtimeService.resume(executionId);
      state.latestExecutionStatus = instance.status();
      state.updateTime = Instant.now();
      return toView(state);
    }
  }

  public void delete(String id) {
    DefinitionState state = require(id);
    synchronized (state) {
      refreshLatestStatus(state);
      if (isActive(state.latestExecutionStatus)) {
        throw new IllegalStateException("工作流正在运行，不能删除");
      }
      if ("ONLINE".equals(state.status)) {
        throw new IllegalStateException("已上线工作流请先下线后再删除");
      }
      definitions.remove(state.id, state);
    }
  }

  private void validateForOnline(DefinitionState state) {
    if (state.nodes.isEmpty()) {
      throw new IllegalStateException("请先配置至少一个任务节点，再上线工作流");
    }

    Set<String> nodeIds = new HashSet<>();
    for (NodeRequest node : state.nodes) {
      if (!nodeIds.add(node.id())) {
        throw new IllegalStateException("工作流存在重复节点 ID：" + node.id());
      }
      taskRegistry.get(node.taskId());
    }

    Map<String, Integer> indegree = new HashMap<>();
    Map<String, List<String>> adjacency = new HashMap<>();
    for (String nodeId : nodeIds) {
      indegree.put(nodeId, 0);
      adjacency.put(nodeId, new ArrayList<>());
    }
    for (EdgeRequest edge : state.edges) {
      if (!nodeIds.contains(edge.source()) || !nodeIds.contains(edge.target())) {
        throw new IllegalStateException("连线引用了不存在的节点：" + edge.source() + " -> " + edge.target());
      }
      if (edge.source().equals(edge.target())) {
        throw new IllegalStateException("工作流节点不能连接自身：" + edge.source());
      }
      adjacency.get(edge.source()).add(edge.target());
      indegree.compute(edge.target(), (key, value) -> value == null ? 1 : value + 1);
    }

    ArrayDeque<String> queue = new ArrayDeque<>();
    indegree.forEach((nodeId, degree) -> {
      if (degree == 0) {
        queue.add(nodeId);
      }
    });
    int visited = 0;
    while (!queue.isEmpty()) {
      String current = queue.removeFirst();
      visited++;
      for (String next : adjacency.get(current)) {
        int degree = indegree.compute(next, (key, value) -> value == null ? 0 : value - 1);
        if (degree == 0) {
          queue.addLast(next);
        }
      }
    }
    if (visited != nodeIds.size()) {
      throw new IllegalStateException("工作流存在循环依赖，不能上线");
    }
  }

  private WorkflowRunRequest toRunRequest(DefinitionState state) {
    List<WorkflowRunRequest.NodeRequest> nodes = state.nodes.stream()
        .map(node -> new WorkflowRunRequest.NodeRequest(
            node.id(),
            node.taskId(),
            node.maxAttempts(),
            node.retryDelaySeconds(),
            node.dispatchTimeoutSeconds(),
            node.executionTimeoutSeconds(),
            node.inputMapping(),
            node.triggerRule(),
            node.failurePolicy()))
        .toList();
    List<WorkflowRunRequest.EdgeRequest> edges = state.edges.stream()
        .map(edge -> new WorkflowRunRequest.EdgeRequest(edge.source(), edge.target()))
        .toList();
    return new WorkflowRunRequest(
        state.name,
        nodes,
        edges,
        state.input,
        state.workflowTimeoutSeconds,
        state.failureStrategy);
  }

  private WorkflowDefinitionVO toView(DefinitionState state) {
    synchronized (state) {
      refreshLatestStatus(state);
      return new WorkflowDefinitionVO(
          state.id,
          state.name,
          state.description,
          state.status,
          state.nodes.size(),
          state.edges.size(),
          state.nodes,
          state.edges,
          state.input,
          state.workflowTimeoutSeconds,
          state.failureStrategy,
          state.latestExecutionId,
          state.latestExecutionStatus,
          state.createTime,
          state.updateTime);
    }
  }

  private void refreshLatestStatus(DefinitionState state) {
    if (!StringUtils.hasText(state.latestExecutionId)) {
      return;
    }
    try {
      WorkflowInstanceVO latest = runtimeService.getInstance(state.latestExecutionId);
      state.latestExecutionStatus = latest.status();
    } catch (RuntimeException ignored) {
      // Runtime 和 Definition 当前都仅在内存中；运行实例不可见时保留最后一次已知状态。
    }
  }

  private DefinitionState require(String id) {
    if (!StringUtils.hasText(id)) {
      throw new IllegalArgumentException("工作流 ID 不能为空");
    }
    DefinitionState state = definitions.get(id.trim());
    if (state == null) {
      throw new IllegalArgumentException("工作流定义不存在：" + id);
    }
    return state;
  }

  private String requireLatestExecution(DefinitionState state) {
    refreshLatestStatus(state);
    if (!StringUtils.hasText(state.latestExecutionId)) {
      throw new IllegalStateException("工作流还没有可控制的执行实例");
    }
    return state.latestExecutionId;
  }

  private boolean isActive(String status) {
    return status != null && ACTIVE_EXECUTION_STATUSES.contains(status.toUpperCase(Locale.ROOT));
  }

  private String required(String value, String message) {
    if (!StringUtils.hasText(value)) {
      throw new IllegalArgumentException(message);
    }
    return value.trim();
  }

  private String trim(String value) {
    return StringUtils.hasText(value) ? value.trim() : null;
  }

  private String text(String value) {
    return value == null ? "" : value;
  }

  private String normalize(String value) {
    return StringUtils.hasText(value) ? value.trim().toLowerCase(Locale.ROOT) : null;
  }

  private String normalizeUpper(String value) {
    return StringUtils.hasText(value) ? value.trim().toUpperCase(Locale.ROOT) : null;
  }

  private static final class DefinitionState {
    private String id;
    private String name;
    private String description;
    private String status;
    private List<NodeRequest> nodes;
    private List<EdgeRequest> edges;
    private Map<String, Object> input;
    private long workflowTimeoutSeconds;
    private String failureStrategy;
    private String latestExecutionId;
    private String latestExecutionStatus;
    private Instant createTime;
    private Instant updateTime;
  }
}
