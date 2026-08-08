package io.yak.ops.business.workflow.service;

import static org.assertj.core.api.Assertions.assertThat;

import io.yak.ops.business.job.task.SyncTaskExecution;
import io.yak.ops.business.job.task.SyncTaskRunner;
import io.yak.ops.business.job.task.TaskDefinition;
import io.yak.ops.business.job.task.TaskRegistry;
import io.yak.ops.business.workflow.model.WorkflowInstanceVO;
import io.yak.ops.business.workflow.model.WorkflowRunRequest;
import io.yak.ops.business.workflow.model.WorkflowRunRequest.EdgeRequest;
import io.yak.ops.business.workflow.model.WorkflowRunRequest.NodeRequest;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class WorkflowRuntimeServiceTest {

  private static final Set<String> TERMINAL = Set.of(
      "SUCCESS", "SUCCESS_WITH_WARNINGS", "FAILED", "CANCELED", "TIMED_OUT");

  private WorkflowRuntimeService service;

  @AfterEach
  void tearDown() {
    if (service != null) {
      service.shutdown();
    }
  }

  @Test
  void shouldExecuteReferencedSyncTasksInSerial() throws InterruptedException {
    FakeRunner runner = new FakeRunner();
    service = service(runner, "task-a", "task-b");
    WorkflowRunRequest request = new WorkflowRunRequest(
        "serial",
        List.of(new NodeRequest("a", "task-a"), new NodeRequest("b", "task-b")),
        List.of(new EdgeRequest("a", "b")),
        Map.of());

    WorkflowInstanceVO started = service.run(request);
    assertThat(node(started, "a").taskId()).isEqualTo("task-a");
    assertThat(node(started, "b").status()).isEqualTo("WAITING");
    service.activate(started.id());

    WorkflowInstanceVO completed = waitForTerminal(started.id());
    assertThat(completed.status()).isEqualTo("SUCCESS");
    assertThat(node(completed, "a").output()).containsEntry("taskId", "task-a");
    assertThat(node(completed, "b").status()).isEqualTo("SUCCESS");
  }

  @Test
  void shouldRetryRealTaskUsingNewWorkflowAttempt() throws InterruptedException {
    FakeRunner runner = new FakeRunner();
    runner.failNext("task-a", 1);
    service = service(runner, "task-a");
    WorkflowRunRequest request = new WorkflowRunRequest(
        "retry",
        List.of(new NodeRequest("a", "task-a")),
        List.of(),
        Map.of());

    WorkflowInstanceVO started = service.run(request);
    service.activate(started.id());
    WorkflowInstanceVO failed = waitForTerminal(started.id());
    String firstAttempt = node(failed, "a").currentAttemptId();

    service.retryFailedNode(started.id(), "a");
    WorkflowInstanceVO completed = waitForTerminal(started.id());
    assertThat(completed.status()).isEqualTo("SUCCESS");
    assertThat(node(completed, "a").attemptCount()).isEqualTo(2);
    assertThat(node(completed, "a").currentAttemptId()).isNotEqualTo(firstAttempt);
    assertThat(runner.started("task-a")).isEqualTo(2);
  }

  @Test
  void shouldPreserveFailurePropagation() throws InterruptedException {
    FakeRunner runner = new FakeRunner();
    runner.failNext("task-bad", 10);
    service = service(runner, "task-root", "task-bad", "task-blocked", "task-independent");
    WorkflowRunRequest request = new WorkflowRunRequest(
        "failure",
        List.of(
            new NodeRequest("root", "task-root"),
            new NodeRequest("bad", "task-bad"),
            new NodeRequest("blocked", "task-blocked"),
            new NodeRequest("independent", "task-independent")),
        List.of(
            new EdgeRequest("root", "bad"),
            new EdgeRequest("bad", "blocked"),
            new EdgeRequest("root", "independent")),
        Map.of());

    WorkflowInstanceVO started = service.run(request);
    service.activate(started.id());
    WorkflowInstanceVO completed = waitForTerminal(started.id());

    assertThat(completed.status()).isEqualTo("FAILED");
    assertThat(node(completed, "bad").status()).isEqualTo("FAILED");
    assertThat(node(completed, "blocked").status()).isEqualTo("UPSTREAM_FAILED");
    assertThat(node(completed, "independent").status()).isEqualTo("SUCCESS");
  }

  @Test
  void shouldKeepInputMappingAcrossTaskReferences() throws InterruptedException {
    FakeRunner runner = new FakeRunner();
    service = service(runner, "task-load", "task-consume");
    NodeRequest load = new NodeRequest(
        "load", "task-load", 1, 0L, 0L, 0L,
        Map.of("requestId", "$workflow.requestId"));
    NodeRequest consume = new NodeRequest(
        "consume", "task-consume", 1, 0L, 0L, 0L,
        Map.of("requestId", "load.receivedInput.requestId"));

    WorkflowInstanceVO started = service.run(new WorkflowRunRequest(
        "mapping",
        List.of(load, consume),
        List.of(new EdgeRequest("load", "consume")),
        Map.of("requestId", "REQ-001")));
    service.activate(started.id());
    WorkflowInstanceVO completed = waitForTerminal(started.id());

    assertThat(completed.status()).isEqualTo("SUCCESS");
    assertThat(node(completed, "load").input()).containsEntry("requestId", "REQ-001");
    assertThat(node(completed, "consume").input()).containsEntry("requestId", "REQ-001");
  }

  @Test
  void shouldCancelSyncExecutionWhenWorkflowTimesOut() throws InterruptedException {
    FakeRunner runner = new FakeRunner();
    runner.duration("task-slow", 3_000L);
    service = service(runner, "task-slow");
    WorkflowInstanceVO started = service.run(new WorkflowRunRequest(
        "timeout",
        List.of(new NodeRequest("slow", "task-slow")),
        List.of(),
        Map.of(),
        1L));
    service.activate(started.id());

    WorkflowInstanceVO completed = waitForTerminal(started.id());
    assertThat(completed.status()).isEqualTo("TIMED_OUT");
    assertThat(node(completed, "slow").status()).isEqualTo("CANCELED");
    assertThat(runner.cancelCount()).isGreaterThanOrEqualTo(1);
  }

  private WorkflowRuntimeService service(FakeRunner runner, String... taskIds) {
    Map<String, TaskDefinition> tasks = new ConcurrentHashMap<>();
    for (String taskId : taskIds) {
      tasks.put(taskId, new TaskDefinition(taskId, taskId, "SYNC"));
    }
    TaskRegistry registry = new TaskRegistry() {
      @Override
      public List<TaskDefinition> list() {
        return List.copyOf(tasks.values());
      }

      @Override
      public TaskDefinition get(String taskId) {
        TaskDefinition task = tasks.get(taskId);
        if (task == null) {
          throw new IllegalArgumentException("任务不存在：" + taskId);
        }
        return task;
      }
    };
    return new WorkflowRuntimeService(
        new WorkflowEventStreamService(), registry, runner, 2L);
  }

  private WorkflowInstanceVO waitForTerminal(String executionId) throws InterruptedException {
    for (int i = 0; i < 800; i++) {
      WorkflowInstanceVO current = service.getInstance(executionId);
      if (TERMINAL.contains(current.status())) {
        return current;
      }
      Thread.sleep(10L);
    }
    return service.getInstance(executionId);
  }

  private WorkflowInstanceVO.NodeInstanceVO node(WorkflowInstanceVO instance, String id) {
    return instance.nodes().stream().filter(item -> id.equals(item.id())).findFirst().orElseThrow();
  }

  private static final class FakeRunner implements SyncTaskRunner {
    private final AtomicLong sequence = new AtomicLong();
    private final AtomicInteger cancels = new AtomicInteger();
    private final ConcurrentMap<String, AtomicInteger> failures = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, AtomicInteger> starts = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Long> durations = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, State> executions = new ConcurrentHashMap<>();

    void failNext(String taskId, int count) {
      failures.put(taskId, new AtomicInteger(count));
    }

    void duration(String taskId, long millis) {
      durations.put(taskId, millis);
    }

    int started(String taskId) {
      AtomicInteger value = starts.get(taskId);
      return value == null ? 0 : value.get();
    }

    int cancelCount() {
      return cancels.get();
    }

    @Override
    public SyncTaskExecution start(String taskId) {
      AtomicInteger remaining = failures.computeIfAbsent(taskId, ignored -> new AtomicInteger());
      boolean fail = remaining.getAndUpdate(value -> Math.max(0, value - 1)) > 0;
      String id = String.valueOf(sequence.incrementAndGet());
      State state = new State(
          id,
          taskId,
          System.nanoTime(),
          durations.getOrDefault(taskId, 20L),
          fail ? "FAILED" : "SUCCEEDED");
      executions.put(id, state);
      starts.computeIfAbsent(taskId, ignored -> new AtomicInteger()).incrementAndGet();
      return view(state);
    }

    @Override
    public SyncTaskExecution status(String executionId) {
      return view(executions.get(executionId));
    }

    @Override
    public void cancel(String executionId) {
      State state = executions.get(executionId);
      if (state != null) {
        state.canceled = true;
        cancels.incrementAndGet();
      }
    }

    private SyncTaskExecution view(State state) {
      if (state == null) {
        throw new IllegalArgumentException("execution not found");
      }
      long elapsed = (System.nanoTime() - state.startedNanos) / 1_000_000L;
      String status = state.canceled
          ? "CANCELED"
          : elapsed >= state.durationMillis ? state.terminalStatus : "RUNNING";
      return new SyncTaskExecution(
          state.executionId,
          status,
          "FAILED".equals(status) ? "planned failure" : null,
          Map.of("taskId", state.taskId));
    }

    private static final class State {
      private final String executionId;
      private final String taskId;
      private final long startedNanos;
      private final long durationMillis;
      private final String terminalStatus;
      private volatile boolean canceled;

      private State(
          String executionId,
          String taskId,
          long startedNanos,
          long durationMillis,
          String terminalStatus) {
        this.executionId = executionId;
        this.taskId = taskId;
        this.startedNanos = startedNanos;
        this.durationMillis = durationMillis;
        this.terminalStatus = terminalStatus;
      }
    }
  }
}
