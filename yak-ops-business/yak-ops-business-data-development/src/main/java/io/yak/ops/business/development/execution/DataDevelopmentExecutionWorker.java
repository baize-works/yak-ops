package io.yak.ops.business.development.execution;

import com.fasterxml.jackson.databind.JsonNode;
import io.yak.ops.business.development.config.ConditionalOnDataDevelopmentEnabled;
import io.yak.ops.business.development.config.DataDevelopmentProperties;
import io.yak.ops.business.development.domain.DataDevelopmentModel.Execution;
import io.yak.ops.business.development.domain.DataDevelopmentModel.ExecutionStatus;
import io.yak.ops.business.development.repository.DataDevelopmentExecutionRepository;
import io.yak.ops.business.development.repository.DataDevelopmentRepository;
import io.yak.ops.business.development.service.DataDevelopmentJsonCodec;
import io.yak.ops.business.development.service.DataDevelopmentPlatformRuntimeResolver;
import io.yak.ops.core.workflow.WorkflowTaskExecutorRegistry;
import io.yak.ops.plugin.task.api.TaskPluginCatalog;
import io.yak.ops.spi.workflow.WorkflowTaskContext;
import io.yak.ops.spi.workflow.WorkflowTaskExecutor;
import io.yak.ops.spi.workflow.WorkflowTaskResult;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CancellationException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

/** Executes one durable data-development execution through an existing task plugin. */
@ConditionalOnDataDevelopmentEnabled
@Component
public class DataDevelopmentExecutionWorker {

  private static final int MAX_LOG_LINE_LENGTH = 16_000;

  private final DataDevelopmentRepository controlRepository;
  private final DataDevelopmentExecutionRepository executionRepository;
  private final DataDevelopmentJsonCodec json;
  private final TaskPluginCatalog taskPluginCatalog;
  private final WorkflowTaskExecutorRegistry executorRegistry;
  private final DataDevelopmentExecutionRuntimeRegistry runtimeRegistry;
  private final DataDevelopmentExecutionEventStream eventStream;
  private final DataDevelopmentPlatformRuntimeResolver platformRuntimeResolver;
  private final String workerId;

  public DataDevelopmentExecutionWorker(
      DataDevelopmentRepository controlRepository,
      DataDevelopmentExecutionRepository executionRepository,
      DataDevelopmentJsonCodec json,
      TaskPluginCatalog taskPluginCatalog,
      @Qualifier("dataDevelopmentTaskExecutorRegistry") WorkflowTaskExecutorRegistry executorRegistry,
      DataDevelopmentExecutionRuntimeRegistry runtimeRegistry,
      DataDevelopmentExecutionEventStream eventStream,
      DataDevelopmentPlatformRuntimeResolver platformRuntimeResolver,
      DataDevelopmentProperties properties) {
    this.controlRepository = controlRepository;
    this.executionRepository = executionRepository;
    this.json = json;
    this.taskPluginCatalog = taskPluginCatalog;
    this.executorRegistry = executorRegistry;
    this.runtimeRegistry = runtimeRegistry;
    this.eventStream = eventStream;
    this.platformRuntimeResolver = platformRuntimeResolver;
    this.workerId = properties.getExecution().getWorkerId();
  }

  public void execute(long executionId) {
    Execution queued = requireExecution(executionId);
    if (queued.status().terminal()) return;

    int attemptNo = queued.currentAttemptNo() + 1;
    LocalDateTime startedAt = LocalDateTime.now();
    if (executionRepository.markRunning(executionId, attemptNo, startedAt) != 1) return;

    Execution execution = requireExecution(executionId);
    long attemptId = executionRepository.insertAttempt(
        executionId, attemptNo, execution.taskType(), workerId, startedAt);
    eventStream.publish(executionId, attemptId, "EXECUTION_RUNNING",
        Map.of("status", ExecutionStatus.RUNNING.name(), "attemptNo", attemptNo));

    WorkflowTaskExecutor executor = executorRegistry.require(execution.taskType());
    DataDevelopmentExecutionRuntimeRegistry.CancellationSignal cancellation = runtimeRegistry.newSignal();
    WorkflowTaskContext context = new WorkflowTaskContext(
        execution.id(), execution.taskId(), attemptId, attemptNo,
        Long.toString(execution.taskId()), execution.taskType(), configuration(execution),
        runtimeParameters(execution), cancellation,
        line -> eventStream.publish(executionId, attemptId, "LOG",
            Map.of("level", "INFO", "line", sanitizeLine(line))));

    runtimeRegistry.register(executionId, attemptId, cancellation, executor, context);
    long startedNanos = System.nanoTime();
    try {
      WorkflowTaskResult result = executor.execute(context);
      cancellation.throwIfCancellationRequested();
      if (result.success()) {
        finishSucceeded(execution, attemptId, result, startedAt, startedNanos);
      } else {
        persistResult(execution, attemptId, result, startedAt, startedNanos);
        finishFailed(executionId, attemptId, "PLUGIN_EXECUTION_FAILED",
            defaultMessage(result.message(), "任务插件返回失败"));
      }
    } catch (CancellationException error) {
      finishInterrupted(executionId, attemptId, error.getMessage());
    } catch (InterruptedException error) {
      Thread.currentThread().interrupt();
      finishInterrupted(executionId, attemptId, "执行线程被中断");
    } catch (Exception error) {
      finishFailed(executionId, attemptId, error.getClass().getSimpleName(),
          defaultMessage(error.getMessage(), "任务插件执行异常"));
    } finally {
      runtimeRegistry.unregister(executionId);
    }
  }

  private void finishSucceeded(
      Execution execution, long attemptId, WorkflowTaskResult result,
      LocalDateTime startedAt, long startedNanos) {
    if (currentStatus(execution.id()) != ExecutionStatus.RUNNING) {
      finishInterrupted(execution.id(), attemptId, "执行状态已被外部终止");
      return;
    }
    PersistedResult persisted = persistResult(execution, attemptId, result, startedAt, startedNanos);
    executionRepository.completeAttempt(attemptId, ExecutionStatus.SUCCEEDED,
        result.externalId(), persisted.exitCode(), null, null, persisted.finishedAt());
    if (executionRepository.markSucceeded(execution.id(), persisted.finishedAt()) == 1) {
      eventStream.publish(execution.id(), attemptId, "EXECUTION_SUCCEEDED",
          Map.of("status", ExecutionStatus.SUCCEEDED.name(),
              "durationMs", persisted.durationMs()));
    }
  }

  private PersistedResult persistResult(
      Execution execution, long attemptId, WorkflowTaskResult result,
      LocalDateTime startedAt, long startedNanos) {
    LocalDateTime finishedAt = LocalDateTime.now();
    long durationMs = Duration.ofNanos(System.nanoTime() - startedNanos).toMillis();
    Map<String, Object> summary = new LinkedHashMap<>();
    summary.put("message", result.message());
    summary.put("externalExecutionId", result.externalId());
    summary.put("durationMs", durationMs);
    summary.put("startedAt", startedAt.toString());
    summary.put("finishedAt", finishedAt.toString());

    Integer exitCode = integer(result.outputs().get("exitCode"));
    String resultKind = taskPluginCatalog.descriptor(execution.taskType()).resultKind().name();
    boolean truncated = Boolean.TRUE.equals(result.outputs().get("bodyTruncated"))
        || Boolean.TRUE.equals(result.outputs().get("truncated"));
    String datasetRef = text(result.outputs().get("datasetRef"));
    long resultId = executionRepository.insertResult(execution.id(), attemptId, resultKind,
        json.write(json.toTree(summary)), json.write(json.toTree(result.outputs())),
        datasetRef, truncated, finishedAt);
    eventStream.publish(execution.id(), attemptId, "RESULT",
        Map.of("resultId", resultId, "resultKind", resultKind));
    return new PersistedResult(finishedAt, durationMs, exitCode);
  }

  private void finishFailed(long executionId, long attemptId, String code, String message) {
    LocalDateTime now = LocalDateTime.now();
    executionRepository.completeAttempt(
        attemptId, ExecutionStatus.FAILED, null, null, code, message, now);
    if (executionRepository.markFailed(executionId, code, message, now) == 1) {
      eventStream.publish(executionId, attemptId, "EXECUTION_FAILED",
          Map.of("status", ExecutionStatus.FAILED.name(),
              "errorCode", code, "errorMessage", message));
    }
  }

  private void finishInterrupted(long executionId, long attemptId, String message) {
    ExecutionStatus status = currentStatus(executionId);
    LocalDateTime now = LocalDateTime.now();
    if (status == ExecutionStatus.TIMED_OUT) {
      executionRepository.completeAttempt(attemptId, ExecutionStatus.TIMED_OUT,
          null, null, "EXECUTION_TIMEOUT", message, now);
      return;
    }
    executionRepository.completeAttempt(
        attemptId, ExecutionStatus.CANCELED, null, null, null, message, now);
    if ((status == ExecutionStatus.RUNNING || status == ExecutionStatus.QUEUED)
        && executionRepository.markCanceled(executionId, now) == 1) {
      eventStream.publish(executionId, attemptId, "EXECUTION_CANCELED",
          Map.of("status", ExecutionStatus.CANCELED.name()));
    }
  }

  private Map<String, Object> configuration(Execution execution) {
    JsonNode compiled = execution.compiledSpecSnapshot();
    JsonNode value = compiled == null ? null : compiled.get("configuration");
    if (value != null && value.isObject()) return json.toMap(value);
    JsonNode definition = execution.definitionSnapshot();
    return objectMap(definition == null ? null : definition.get("config"));
  }

  private Map<String, Object> runtimeParameters(Execution execution) {
    Map<String, Object> values = new LinkedHashMap<>();
    JsonNode runtime = execution.runtimeSnapshot();
    values.putAll(platformRuntimeResolver.resolve(runtime));
    if (runtime != null && runtime.isObject()) {
      JsonNode parameters = runtime.path("common").path("parameters");
      if (parameters.isObject()) values.putAll(json.toMap(parameters));
    }
    values.putAll(objectMap(execution.inputSnapshot()));
    return values;
  }

  private Map<String, Object> objectMap(JsonNode value) {
    return value != null && value.isObject() ? json.toMap(value) : new LinkedHashMap<>();
  }

  private ExecutionStatus currentStatus(long executionId) {
    return controlRepository.findExecution(executionId)
        .map(Execution::status).orElse(ExecutionStatus.LOST);
  }

  private Execution requireExecution(long executionId) {
    return controlRepository.findExecution(executionId)
        .orElseThrow(() -> new IllegalArgumentException("任务执行不存在：" + executionId));
  }

  private static Integer integer(Object value) {
    if (value == null) return null;
    if (value instanceof Number number) return number.intValue();
    try { return Integer.valueOf(String.valueOf(value)); }
    catch (NumberFormatException ignored) { return null; }
  }

  private static String text(Object value) {
    if (value == null) return null;
    String result = String.valueOf(value);
    return result.isBlank() ? null : result;
  }

  private static String sanitizeLine(String line) {
    String value = line == null ? "" : line;
    return value.length() <= MAX_LOG_LINE_LENGTH
        ? value : value.substring(0, MAX_LOG_LINE_LENGTH) + "...";
  }

  private static String defaultMessage(String value, String fallback) {
    return value == null || value.isBlank() ? fallback : value;
  }

  private record PersistedResult(LocalDateTime finishedAt, long durationMs, Integer exitCode) {
  }
}
