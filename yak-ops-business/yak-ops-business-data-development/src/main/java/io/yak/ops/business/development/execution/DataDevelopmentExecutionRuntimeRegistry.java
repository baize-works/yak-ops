package io.yak.ops.business.development.execution;

import io.yak.ops.business.development.config.ConditionalOnDataDevelopmentEnabled;
import io.yak.ops.spi.workflow.WorkflowCancellationToken;
import io.yak.ops.spi.workflow.WorkflowTaskContext;
import io.yak.ops.spi.workflow.WorkflowTaskExecutor;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.stereotype.Component;

/** Tracks in-process plugin executions so cancel and timeout requests reach the real executor. */
@ConditionalOnDataDevelopmentEnabled
@Component
public class DataDevelopmentExecutionRuntimeRegistry {

  private final ConcurrentMap<Long, RunningExecution> running = new ConcurrentHashMap<>();

  public CancellationSignal newSignal() {
    return new CancellationSignal();
  }

  public void register(
      long executionId,
      long attemptId,
      CancellationSignal signal,
      WorkflowTaskExecutor executor,
      WorkflowTaskContext context) {
    RunningExecution value = new RunningExecution(
        attemptId,
        signal,
        executor,
        context,
        Thread.currentThread());
    if (running.putIfAbsent(executionId, value) != null) {
      throw new IllegalStateException("执行已经在当前 Worker 中运行：" + executionId);
    }
  }

  public void unregister(long executionId) {
    running.remove(executionId);
  }

  public boolean cancel(long executionId) {
    RunningExecution value = running.get(executionId);
    if (value == null) {
      return false;
    }
    value.signal().cancel();
    try {
      value.executor().cancel(value.context());
    } catch (Exception ignored) {
      // Cancellation remains best effort; the worker thread is interrupted below as a fallback.
    }
    value.thread().interrupt();
    return true;
  }

  public Long attemptId(long executionId) {
    RunningExecution value = running.get(executionId);
    return value == null ? null : value.attemptId();
  }

  public static final class CancellationSignal implements WorkflowCancellationToken {

    private final AtomicBoolean canceled = new AtomicBoolean();

    @Override
    public boolean isCancellationRequested() {
      return canceled.get() || Thread.currentThread().isInterrupted();
    }

    public void cancel() {
      canceled.set(true);
    }
  }

  private record RunningExecution(
      long attemptId,
      CancellationSignal signal,
      WorkflowTaskExecutor executor,
      WorkflowTaskContext context,
      Thread thread) {
  }
}
