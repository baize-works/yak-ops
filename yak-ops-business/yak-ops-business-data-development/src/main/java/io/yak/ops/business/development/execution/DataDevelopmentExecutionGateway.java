package io.yak.ops.business.development.execution;

import io.yak.ops.business.development.config.ConditionalOnDataDevelopmentEnabled;
import io.yak.ops.business.development.config.DataDevelopmentProperties;
import io.yak.ops.business.development.domain.DataDevelopmentModel.Execution;
import io.yak.ops.business.development.domain.DataDevelopmentModel.ExecutionStatus;
import io.yak.ops.business.development.repository.DataDevelopmentExecutionRepository;
import io.yak.ops.business.development.repository.DataDevelopmentRepository;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.FutureTask;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.context.annotation.DependsOn;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Local bounded gateway that dispatches durable executions to task-plugin workers. */
@ConditionalOnDataDevelopmentEnabled
@DependsOn("dataDevelopmentFlyway")
@Component
public class DataDevelopmentExecutionGateway {

  private final DataDevelopmentRepository controlRepository;
  private final DataDevelopmentExecutionRepository executionRepository;
  private final DataDevelopmentExecutionWorker worker;
  private final DataDevelopmentExecutionRuntimeRegistry runtimeRegistry;
  private final DataDevelopmentExecutionEventStream eventStream;
  private final ThreadPoolExecutor executor;
  private final ScheduledExecutorService scheduler;
  private final int defaultTimeoutSeconds;
  private final Map<Long, FutureTask<Void>> tasks = new ConcurrentHashMap<>();
  private final Map<Long, ScheduledFuture<?>> timeouts = new ConcurrentHashMap<>();

  public DataDevelopmentExecutionGateway(
      DataDevelopmentRepository controlRepository,
      DataDevelopmentExecutionRepository executionRepository,
      DataDevelopmentExecutionWorker worker,
      DataDevelopmentExecutionRuntimeRegistry runtimeRegistry,
      DataDevelopmentExecutionEventStream eventStream,
      DataDevelopmentProperties properties) {
    this.controlRepository = controlRepository;
    this.executionRepository = executionRepository;
    this.worker = worker;
    this.runtimeRegistry = runtimeRegistry;
    this.eventStream = eventStream;

    DataDevelopmentProperties.Execution settings = properties.getExecution();
    int corePoolSize = Math.max(1, settings.getCorePoolSize());
    int maximumPoolSize = Math.max(corePoolSize, settings.getMaximumPoolSize());
    int queueCapacity = Math.max(1, settings.getQueueCapacity());
    this.defaultTimeoutSeconds = Math.max(1, settings.getDefaultTimeoutSeconds());
    this.executor = new ThreadPoolExecutor(
        corePoolSize,
        maximumPoolSize,
        60L,
        TimeUnit.SECONDS,
        new LinkedBlockingQueue<>(queueCapacity),
        namedFactory("yak-data-development-worker-"),
        new ThreadPoolExecutor.AbortPolicy());
    this.executor.allowCoreThreadTimeOut(true);
    this.scheduler = java.util.concurrent.Executors.newSingleThreadScheduledExecutor(
        namedFactory("yak-data-development-timeout-"));
  }

  public void dispatchAfterCommit(long executionId) {
    if (!TransactionSynchronizationManager.isSynchronizationActive()) {
      dispatch(executionId);
      return;
    }
    TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
      @Override
      public void afterCommit() {
        dispatch(executionId);
      }
    });
  }

  public void dispatch(long executionId) {
    Execution execution = requireExecution(executionId);
    if (execution.status().terminal() || execution.status() == ExecutionStatus.RUNNING) {
      return;
    }
    if (execution.status() == ExecutionStatus.CREATED) {
      if (executionRepository.markQueued(executionId) != 1) {
        return;
      }
      eventStream.publish(
          executionId,
          null,
          "EXECUTION_QUEUED",
          Map.of("status", ExecutionStatus.QUEUED.name()));
      execution = requireExecution(executionId);
    }
    if (execution.status() != ExecutionStatus.QUEUED) {
      return;
    }

    FutureTask<Void> task = new FutureTask<>(() -> {
      worker.execute(executionId);
      return null;
    }) {
      @Override
      protected void done() {
        tasks.remove(executionId, this);
        ScheduledFuture<?> timeout = timeouts.remove(executionId);
        if (timeout != null) {
          timeout.cancel(false);
        }
      }
    };

    if (tasks.putIfAbsent(executionId, task) != null) {
      return;
    }
    try {
      executor.execute(task);
      int timeoutSeconds = timeoutSeconds(execution);
      timeouts.put(
          executionId,
          scheduler.schedule(
              () -> timeout(executionId, timeoutSeconds),
              timeoutSeconds,
              TimeUnit.SECONDS));
    } catch (RejectedExecutionException error) {
      tasks.remove(executionId, task);
      failQueueSubmission(executionId);
    }
  }

  public Execution cancel(long executionId) {
    Execution execution = requireExecution(executionId);
    if (execution.status().terminal()) {
      return execution;
    }
    LocalDateTime now = LocalDateTime.now();
    if (executionRepository.markCanceled(executionId, now) == 1) {
      executionRepository.completeRunningAttempt(
          executionId,
          ExecutionStatus.CANCELED,
          null,
          "用户取消执行",
          now);
      Long attemptId = runtimeRegistry.attemptId(executionId);
      runtimeRegistry.cancel(executionId);
      FutureTask<Void> task = tasks.get(executionId);
      if (task != null) {
        task.cancel(true);
      }
      ScheduledFuture<?> timeout = timeouts.remove(executionId);
      if (timeout != null) {
        timeout.cancel(false);
      }
      eventStream.publish(
          executionId,
          attemptId,
          "EXECUTION_CANCELED",
          Map.of("status", ExecutionStatus.CANCELED.name()));
    }
    return requireExecution(executionId);
  }

  private void timeout(long executionId, int timeoutSeconds) {
    LocalDateTime now = LocalDateTime.now();
    String message = "执行超过 " + timeoutSeconds + " 秒，已请求终止";
    if (executionRepository.markTimedOut(executionId, message, now) != 1) {
      return;
    }
    executionRepository.completeRunningAttempt(
        executionId,
        ExecutionStatus.TIMED_OUT,
        "EXECUTION_TIMEOUT",
        message,
        now);
    Long attemptId = runtimeRegistry.attemptId(executionId);
    runtimeRegistry.cancel(executionId);
    FutureTask<Void> task = tasks.get(executionId);
    if (task != null) {
      task.cancel(true);
    }
    eventStream.publish(
        executionId,
        attemptId,
        "EXECUTION_TIMED_OUT",
        Map.of(
            "status", ExecutionStatus.TIMED_OUT.name(),
            "timeoutSeconds", timeoutSeconds,
            "errorMessage", message));
  }

  private void failQueueSubmission(long executionId) {
    LocalDateTime now = LocalDateTime.now();
    String message = "执行队列已满，请稍后重试";
    if (executionRepository.markFailed(
        executionId,
        "EXECUTION_QUEUE_REJECTED",
        message,
        now) == 1) {
      eventStream.publish(
          executionId,
          null,
          "EXECUTION_FAILED",
          Map.of(
              "status", ExecutionStatus.FAILED.name(),
              "errorCode", "EXECUTION_QUEUE_REJECTED",
              "errorMessage", message));
    }
  }

  private int timeoutSeconds(Execution execution) {
    int configured = execution.runtimeSnapshot()
        .path("common")
        .path("timeoutSeconds")
        .asInt(defaultTimeoutSeconds);
    return configured > 0 ? configured : defaultTimeoutSeconds;
  }

  private Execution requireExecution(long executionId) {
    return controlRepository.findExecution(executionId)
        .orElseThrow(() -> new IllegalArgumentException("任务执行不存在：" + executionId));
  }

  @PostConstruct
  public void recover() {
    for (Long executionId : executionRepository.listRecoverableExecutionIds(500)) {
      Execution execution = requireExecution(executionId);
      if (execution.status() == ExecutionStatus.RUNNING) {
        LocalDateTime now = LocalDateTime.now();
        String message = "服务重启后无法恢复本地运行上下文";
        executionRepository.completeRunningAttempt(
            executionId,
            ExecutionStatus.LOST,
            "WORKER_RESTARTED",
            message,
            now);
        if (executionRepository.markLost(executionId, message, now) == 1) {
          eventStream.publish(
              executionId,
              null,
              "EXECUTION_LOST",
              Map.of(
                  "status", ExecutionStatus.LOST.name(),
                  "errorMessage", message));
        }
      } else {
        dispatch(executionId);
      }
    }
  }

  @PreDestroy
  public void close() {
    tasks.values().forEach(task -> task.cancel(true));
    runtimeRegistryCancelAll();
    scheduler.shutdownNow();
    executor.shutdownNow();
  }

  private void runtimeRegistryCancelAll() {
    tasks.keySet().forEach(runtimeRegistry::cancel);
  }

  private static ThreadFactory namedFactory(String prefix) {
    AtomicInteger sequence = new AtomicInteger();
    return runnable -> {
      Thread thread = new Thread(runnable, prefix + sequence.incrementAndGet());
      thread.setDaemon(true);
      return thread;
    };
  }
}
