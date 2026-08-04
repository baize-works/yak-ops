package io.yak.ops.business.quality.service;

import io.yak.ops.business.quality.api.QualityExecutionApi.ExecutionPageRequest;
import io.yak.ops.business.quality.api.QualityExecutionApi.ExecutionPageView;
import io.yak.ops.business.quality.api.QualityExecutionApi.ExecutionView;
import io.yak.ops.business.quality.api.QualityExecutionApi.TriggerType;
import io.yak.ops.business.quality.api.QualityRuleApi.RuleView;
import io.yak.ops.business.quality.execution.QualityExecutionGateway;
import io.yak.ops.business.quality.execution.QualityMetricEvaluator;
import io.yak.ops.business.quality.repository.QualityExecutionRepository;
import io.yak.ops.business.quality.repository.QualityExecutionRepository.PageResult;
import io.yak.ops.business.quality.repository.QualityRuleRepository;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

public class QualityExecutionService {

  private static final DateTimeFormatter EXECUTION_TIME =
      DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS");

  private final QualityRuleRepository ruleRepository;
  private final QualityExecutionRepository executionRepository;
  private final QualityMetricEvaluator evaluator;
  private final QualityExecutionGateway gateway;

  public QualityExecutionService(
      QualityRuleRepository ruleRepository,
      QualityExecutionRepository executionRepository,
      QualityMetricEvaluator evaluator,
      QualityExecutionGateway gateway) {
    this.ruleRepository = ruleRepository;
    this.executionRepository = executionRepository;
    this.evaluator = evaluator;
    this.gateway = gateway;
  }

  @Transactional(transactionManager = "qualityTransactionManager")
  public ExecutionView run(long ruleId, String operator) {
    RuleView rule = ruleRepository.findByIdForUpdate(ruleId)
        .orElseThrow(() -> new IllegalArgumentException("质量规则不存在：" + ruleId));
    if (!rule.enabled()) {
      throw new IllegalStateException("质量规则已停用，无法执行");
    }
    if (executionRepository.hasActiveExecution(ruleId)) {
      throw new IllegalStateException("该质量规则已有运行中的检查任务");
    }

    LocalDateTime queuedAt = LocalDateTime.now();
    String executionNo = executionNo(queuedAt);
    String expectedDisplay = evaluator.expectedValue(
        io.yak.ops.business.quality.api.QualityRuleApi.ComparisonOperator.fromSymbol(
            rule.operator()),
        rule.threshold(),
        rule.thresholdEnd(),
        rule.unit());
    long executionId = executionRepository.insert(
        executionNo,
        rule,
        TriggerType.MANUAL,
        normalizeOperator(operator),
        objectName(rule),
        expectedDisplay,
        queuedAt);
    ruleRepository.markExecutionStarted(ruleId, queuedAt);
    dispatchAfterCommit(executionId);
    return executionRepository.findByExecutionNo(executionNo)
        .orElseThrow(() -> new IllegalStateException("质量检查已创建，但执行记录不可见"));
  }

  @Transactional(readOnly = true, transactionManager = "qualityTransactionManager")
  public ExecutionPageView page(ExecutionPageRequest request) {
    PageResult result = executionRepository.page(request);
    return new ExecutionPageView(
        result.records(),
        result.total(),
        request.normalizedCurrent(),
        request.normalizedPageSize(),
        executionRepository.summary());
  }

  @Transactional(readOnly = true, transactionManager = "qualityTransactionManager")
  public ExecutionView get(String executionNo) {
    return executionRepository.findByExecutionNo(executionNo)
        .orElseThrow(
            () -> new IllegalArgumentException("质量执行记录不存在：" + executionNo));
  }

  private void dispatchAfterCommit(long executionId) {
    if (!TransactionSynchronizationManager.isSynchronizationActive()) {
      gateway.dispatch(executionId);
      return;
    }
    TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
          @Override
          public void afterCommit() {
            gateway.dispatch(executionId);
          }
        });
  }

  private static String executionNo(LocalDateTime queuedAt) {
    return "QE-" + EXECUTION_TIME.format(queuedAt) + "-"
        + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
  }

  private static String objectName(RuleView rule) {
    return String.join(
        ".",
        java.util.stream.Stream.of(
                rule.databaseName(),
                rule.tableName(),
                rule.columnName())
            .filter(value -> value != null && !value.isBlank())
            .toList());
  }

  private static String normalizeOperator(String operator) {
    return operator == null || operator.isBlank() ? "system" : operator.trim();
  }
}
