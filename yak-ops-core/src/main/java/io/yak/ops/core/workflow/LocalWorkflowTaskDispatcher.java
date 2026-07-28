package io.yak.ops.core.workflow;

import java.time.Duration;
import java.util.Objects;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.Callable;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Future;
import java.util.concurrent.RejectedExecutionHandler;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/** Bounded, process-local dispatcher used by the lightweight workflow runtime. */
public final class LocalWorkflowTaskDispatcher implements AutoCloseable {

  private final ThreadPoolExecutor executor;
  private final ScheduledExecutorService scheduler;

  public LocalWorkflowTaskDispatcher(
      int corePoolSize,
      int maximumPoolSize,
      int queueCapacity,
      String threadNamePrefix) {
    if (corePoolSize < 1 || maximumPoolSize < corePoolSize || queueCapacity < 1) {
      throw new IllegalArgumentException("Invalid workflow dispatcher pool configuration");
    }
    String prefix = threadNamePrefix == null || threadNamePrefix.isBlank()
        ? "yak-workflow-"
        : threadNamePrefix;
    RejectedExecutionHandler rejection = new ThreadPoolExecutor.AbortPolicy();
    this.executor = new ThreadPoolExecutor(
        corePoolSize,
        maximumPoolSize,
        60L,
        TimeUnit.SECONDS,
        new ArrayBlockingQueue<>(queueCapacity),
        namedThreadFactory(prefix + "task-"),
        rejection);
    this.executor.allowCoreThreadTimeOut(false);
    this.scheduler = new ScheduledThreadPoolExecutor(
        Math.max(1, Math.min(2, corePoolSize)),
        namedThreadFactory(prefix + "timer-"));
  }

  public <T> DispatchHandle<T> submit(Callable<T> task) {
    Objects.requireNonNull(task, "task");
    CompletableFuture<T> completion = new CompletableFuture<>();
    Future<?> submitted = executor.submit(() -> {
      try {
        completion.complete(task.call());
      } catch (Throwable error) {
        completion.completeExceptionally(error);
      }
    });
    return new DispatchHandle<>(completion, submitted);
  }

  public Future<?> schedule(Runnable task, Duration delay) {
    Objects.requireNonNull(task, "task");
    long delayMillis = Math.max(0L, delay == null ? 0L : delay.toMillis());
    return scheduler.schedule(task, delayMillis, TimeUnit.MILLISECONDS);
  }

  public int activeCount() {
    return executor.getActiveCount();
  }

  public int queuedCount() {
    return executor.getQueue().size();
  }

  @Override
  public void close() {
    scheduler.shutdownNow();
    executor.shutdownNow();
  }

  public static final class DispatchHandle<T> {

    private final CompletableFuture<T> completion;
    private final Future<?> submittedTask;

    public DispatchHandle(CompletableFuture<T> completion, Future<?> submittedTask) {
      this.completion = Objects.requireNonNull(completion, "completion");
      this.submittedTask = Objects.requireNonNull(submittedTask, "submittedTask");
    }

    public CompletableFuture<T> completion() {
      return completion;
    }

    public CompletableFuture<T> getCompletion() {
      return completion;
    }

    public Future<?> submittedTask() {
      return submittedTask;
    }

    public Future<?> getSubmittedTask() {
      return submittedTask;
    }

    public boolean cancel(boolean mayInterruptIfRunning) {
      boolean cancelled = submittedTask.cancel(mayInterruptIfRunning);
      completion.cancel(mayInterruptIfRunning);
      return cancelled;
    }
  }

  private static ThreadFactory namedThreadFactory(String prefix) {
    AtomicInteger sequence = new AtomicInteger();
    return runnable -> {
      Thread thread = new Thread(runnable, prefix + sequence.incrementAndGet());
      thread.setDaemon(true);
      return thread;
    };
  }
}
