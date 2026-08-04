package io.yak.ops.business.quality.service;

import io.yak.ops.business.quality.api.QualityExecutionApi.CheckResult;
import io.yak.ops.business.quality.api.QualityRuleApi.RuleResult;
import io.yak.ops.business.quality.execution.QualityMetricEvaluator.MetricMeasurement;
import io.yak.ops.business.quality.repository.QualityExecutionRepository;
import io.yak.ops.business.quality.repository.QualityExecutionRepository.ExecutionRuntime;
import io.yak.ops.business.quality.repository.QualityRuleRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

public class QualityExecutionStateService {

  private static final String RESTART_ERROR =
      "服务重启时质量检查仍在运行，已标记为执行失败";

  private final QualityExecutionRepository executionRepository;
  private final QualityRuleRepository ruleRepository;

  public QualityExecutionStateService(
      QualityExecutionRepository executionRepository,
      QualityRuleRepository ruleRepository) {
    this.executionRepository = executionRepository;
    this.ruleRepository = ruleRepository;
  }

  @Transactional(transactionManager = "qualityTransactionManager")
  public ExecutionRuntime start(long executionId) {
    ExecutionRuntime runtime = executionRepository.findRuntimeById(executionId).orElse(null);
    if (runtime == null) {
      return null;
    }
    LocalDateTime startedAt = LocalDateTime.now();
    if (!executionRepository.markRunning(executionId, startedAt)) {
      return null;
    }
    ruleRepository.markExecutionStarted(runtime.ruleId(), startedAt);
    return runtime;
  }

  @Transactional(transactionManager = "qualityTransactionManager")
  public void complete(
      ExecutionRuntime runtime,
      MetricMeasurement measurement,
      boolean passed,
      String expectedDisplay,
      String executedSql,
      long durationMs) {
    LocalDateTime finishedAt = LocalDateTime.now();
    CheckResult checkResult = passed ? CheckResult.PASSED : CheckResult.NOT_PASSED;
    if (!executionRepository.complete(
        runtime.id(),
        checkResult,
        measurement.value(),
        measurement.valueEnd(),
        measurement.displayValue(),
        expectedDisplay,
        executedSql,
        finishedAt,
        durationMs)) {
      return;
    }
    ruleRepository.updateExecutionResult(
        runtime.ruleId(),
        passed ? RuleResult.PASSED : RuleResult.NOT_PASSED,
        measurement.displayValue(),
        finishedAt,
        durationMs);
  }

  @Transactional(transactionManager = "qualityTransactionManager")
  public void fail(
      ExecutionRuntime runtime,
      String executedSql,
      String errorMessage,
      long durationMs) {
    LocalDateTime finishedAt = LocalDateTime.now();
    if (!executionRepository.fail(
        runtime.id(),
        executedSql,
        sanitize(errorMessage),
        finishedAt,
        durationMs)) {
      return;
    }
    ruleRepository.updateExecutionResult(
        runtime.ruleId(),
        RuleResult.ERROR,
        null,
        finishedAt,
        durationMs);
  }

  @Transactional(transactionManager = "qualityTransactionManager")
  public void failQueued(long executionId, String errorMessage) {
    ExecutionRuntime runtime = executionRepository.findRuntimeById(executionId).orElse(null);
    if (runtime == null) {
      return;
    }
    fail(runtime, null, errorMessage, 0L);
  }

  @Transactional(transactionManager = "qualityTransactionManager")
  public List<Long> recover(int waitingLimit) {
    List<Long> interruptedRuleIds = executionRepository.findRunningRuleIds();
    if (!interruptedRuleIds.isEmpty()) {
      LocalDateTime recoveredAt = LocalDateTime.now();
      executionRepository.recoverRunningAsFailed(RESTART_ERROR, recoveredAt);
      for (Long ruleId : interruptedRuleIds) {
        ruleRepository.updateExecutionResult(
            ruleId,
            RuleResult.ERROR,
            null,
            recoveredAt,
            0L);
      }
    }
    return executionRepository.findWaitingIds(waitingLimit);
  }

  private static String sanitize(String message) {
    String normalized = message == null || message.isBlank()
        ? "质量检查执行失败"
        : message.trim();
    return normalized.length() > 1000 ? normalized.substring(0, 1000) : normalized;
  }
}
