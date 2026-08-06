package io.yak.ops.business.quality.service;

import io.yak.ops.business.quality.config.ConditionalOnQualityEnabled;
import io.yak.ops.business.quality.api.QualityApi.ExecutionPageRequest;
import io.yak.ops.business.quality.api.QualityApi.ExecutionPageView;
import io.yak.ops.business.quality.api.QualityApi.ExecutionStatus;
import io.yak.ops.business.quality.api.QualityApi.ExecutionView;
import io.yak.ops.business.quality.api.QualityApi.MonitorView;
import io.yak.ops.business.quality.api.QualityApi.RunView;
import io.yak.ops.business.quality.execution.QualityExecutionWorker;
import io.yak.ops.business.quality.execution.QualityRuntime.ExecutionJob;
import io.yak.ops.business.quality.repository.QualityRepository;
import io.yak.ops.business.quality.repository.QualityRepository.PageResult;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@ConditionalOnQualityEnabled
@Service
public class QualityExecutionService {

  private static final DateTimeFormatter EXECUTION_TIME =
      DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS");

  private final QualityRepository repository;
  private final QualityExecutionWorker worker;
  private final ThreadPoolTaskExecutor taskExecutor;

  public QualityExecutionService(
      QualityRepository repository,
      QualityExecutionWorker worker,
      @Qualifier("qualityExecutionTaskExecutor") ThreadPoolTaskExecutor taskExecutor) {
    this.repository = repository;
    this.worker = worker;
    this.taskExecutor = taskExecutor;
  }

  @Transactional(transactionManager = "yakBusinessTransactionManager")
  public RunView run(long monitorId, String operator) {
    repository.lockMonitor(monitorId);
    MonitorView monitor = repository.findMonitor(monitorId)
        .orElseThrow(() -> new IllegalArgumentException("质量监控不存在：" + monitorId));
    if (!monitor.enabled()) {
      throw new IllegalStateException("质量监控已停用，无法执行");
    }
    int enabledRules = (int) monitor.rules().stream()
        .filter(io.yak.ops.business.quality.api.QualityApi.RuleView::enabled)
        .count();
    if (enabledRules == 0) {
      throw new IllegalStateException("质量监控没有可执行规则");
    }
    if (repository.hasActiveExecution(monitorId)) {
      throw new IllegalStateException("该质量监控已有运行中的检查任务");
    }

    LocalDateTime queuedAt = LocalDateTime.now();
    String executionNo = executionNo(queuedAt);
    long executionId = repository.insertExecution(
        executionNo,
        monitor,
        enabledRules,
        normalizeOperator(operator),
        queuedAt);
    ExecutionJob job = repository.executionJob(monitorId, executionId, executionNo);
    dispatchAfterCommit(job);
    return new RunView(executionNo, ExecutionStatus.WAITING,
        io.yak.ops.business.quality.api.QualityApi.CheckResult.RUNNING);
  }

  @Transactional(readOnly = true, transactionManager = "yakBusinessTransactionManager")
  public ExecutionPageView page(ExecutionPageRequest request) {
    ExecutionPageRequest normalized = request == null
        ? new ExecutionPageRequest(1, 20, null, null, null, null)
        : request;
    PageResult<io.yak.ops.business.quality.api.QualityApi.ExecutionListItem> result =
        repository.pageExecutions(normalized);
    return new ExecutionPageView(
        result.records(),
        result.total(),
        normalized.normalizedCurrent(),
        normalized.normalizedPageSize());
  }

  @Transactional(readOnly = true, transactionManager = "yakBusinessTransactionManager")
  public ExecutionView get(String executionNo) {
    return repository.findExecution(executionNo)
        .orElseThrow(
            () -> new IllegalArgumentException("质量执行记录不存在：" + executionNo));
  }

  private void dispatchAfterCommit(ExecutionJob job) {
    Runnable dispatch = () -> {
      try {
        taskExecutor.execute(() -> worker.execute(job));
      } catch (TaskRejectedException exception) {
        LocalDateTime now = LocalDateTime.now();
        repository.failExecution(job.executionId(), "质量执行队列已满", now, 0L);
        repository.updateMonitorResult(
            job.monitor().id(),
            job.executionNo(),
            io.yak.ops.business.quality.api.QualityApi.CheckResult.ERROR,
            now);
      }
    };
    if (!TransactionSynchronizationManager.isSynchronizationActive()) {
      dispatch.run();
      return;
    }
    TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
          @Override
          public void afterCommit() {
            dispatch.run();
          }
        });
  }

  private static String executionNo(LocalDateTime queuedAt) {
    return "QM-" + EXECUTION_TIME.format(queuedAt) + "-"
        + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
  }

  private static String normalizeOperator(String operator) {
    return operator == null || operator.isBlank() ? "system" : operator.trim();
  }
}
