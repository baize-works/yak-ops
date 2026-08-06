package io.yak.ops.business.quality.execution;

import io.yak.ops.business.datasource.service.DataSourceCatalogService;
import io.yak.ops.business.quality.api.QualityApi.CheckResult;
import io.yak.ops.business.quality.api.QualityApi.RuleFailureAction;
import io.yak.ops.business.quality.config.ConditionalOnQualityEnabled;
import io.yak.ops.business.quality.execution.QualityMetricEvaluator.MetricMeasurement;
import io.yak.ops.business.quality.execution.QualityRuntime.ExecutionJob;
import io.yak.ops.business.quality.execution.QualityRuntime.RuleSnapshot;
import io.yak.ops.business.quality.execution.QualitySqlCompiler.CompiledRule;
import io.yak.ops.business.quality.repository.QualityRepository;
import io.yak.ops.business.quality.repository.QualityRepository.RuleExecutionWrite;
import io.yak.ops.business.quality.service.QualityAlertService;
import io.yak.ops.common.bean.vo.datasource.DataSourceQueryResultVO;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

@ConditionalOnQualityEnabled
@Component
public class QualityExecutionWorker {

  private final QualityRepository repository;
  private final QualitySqlCompiler compiler;
  private final QualityMetricEvaluator evaluator;
  private final DataSourceCatalogService catalogService;
  private final QualityAlertService alertService;

  public QualityExecutionWorker(
      QualityRepository repository,
      QualitySqlCompiler compiler,
      QualityMetricEvaluator evaluator,
      DataSourceCatalogService catalogService,
      QualityAlertService alertService) {
    this.repository = repository;
    this.compiler = compiler;
    this.evaluator = evaluator;
    this.catalogService = catalogService;
    this.alertService = alertService;
  }

  public void execute(ExecutionJob job) {
    LocalDateTime startedAt = LocalDateTime.now();
    if (!repository.markExecutionRunning(job.executionId(), startedAt)) {
      return;
    }

    int passed = 0;
    int failed = 0;
    int errors = 0;
    try {
      for (int index = 0; index < job.rules().size(); index++) {
        RuleSnapshot rule = job.rules().get(index);
        RuleOutcome outcome = executeRule(job, rule);
        switch (outcome.result()) {
          case PASSED -> passed++;
          case NOT_PASSED -> failed++;
          case ERROR -> errors++;
          default -> throw new IllegalStateException("不支持的规则执行结果：" + outcome.result());
        }
        if (job.ruleFailureAction() == RuleFailureAction.STOP
            && outcome.result() != CheckResult.PASSED) {
          markRemainingRulesNotRun(job, index + 1);
          break;
        }
      }
      LocalDateTime finishedAt = LocalDateTime.now();
      CheckResult finalResult = errors > 0
          ? CheckResult.ERROR
          : failed > 0 ? CheckResult.NOT_PASSED : CheckResult.PASSED;
      repository.completeExecution(
          job.executionId(),
          finalResult,
          passed,
          failed,
          errors,
          finishedAt,
          durationMillis(startedAt, finishedAt));
      repository.updateMonitorResult(
          job.monitor().id(),
          job.executionNo(),
          finalResult,
          finishedAt);
      alertService.recordIfNecessary(
          job, job.executionNo(), finalResult, passed, failed, errors);
    } catch (RuntimeException exception) {
      LocalDateTime finishedAt = LocalDateTime.now();
      repository.failExecution(
          job.executionId(),
          message(exception),
          finishedAt,
          durationMillis(startedAt, finishedAt));
      repository.updateMonitorResult(
          job.monitor().id(),
          job.executionNo(),
          CheckResult.ERROR,
          finishedAt);
      alertService.recordIfNecessary(
          job, job.executionNo(), CheckResult.ERROR, passed, failed, errors + 1);
    }
  }

  private RuleOutcome executeRule(ExecutionJob job, RuleSnapshot rule) {
    LocalDateTime startedAt = LocalDateTime.now();
    String sql = null;
    String expected = null;
    try {
      CompiledRule compiled = compiler.compile(job.monitor(), rule);
      sql = compiled.sql();
      expected = compiled.expectedValue();
      Map<String, Object> request = new LinkedHashMap<>();
      request.put("read_mode", "sql");
      request.put("query", sql);
      DataSourceQueryResultVO result = catalogService.preview(
          job.monitor().dataSourceId(),
          request);
      MetricMeasurement measurement = compiler.measure(result);
      boolean passed = evaluator.passes(
          compiled.operator(),
          compiled.threshold(),
          compiled.thresholdEnd(),
          measurement);
      CheckResult checkResult = passed ? CheckResult.PASSED : CheckResult.NOT_PASSED;
      LocalDateTime finishedAt = LocalDateTime.now();
      String metric = measurement.displayValue()
          + (compiled.unit() == null ? "" : compiled.unit());
      repository.insertRuleExecution(new RuleExecutionWrite(
          job.executionId(),
          rule.id(),
          rule.name(),
          rule.templateCode(),
          rule.ruleType(),
          rule.columnName(),
          checkResult,
          metric,
          expected,
          sql,
          null,
          durationMillis(startedAt, finishedAt)));
      return new RuleOutcome(checkResult);
    } catch (RuntimeException exception) {
      LocalDateTime finishedAt = LocalDateTime.now();
      repository.insertRuleExecution(new RuleExecutionWrite(
          job.executionId(),
          rule.id(),
          rule.name(),
          rule.templateCode(),
          rule.ruleType(),
          rule.columnName(),
          CheckResult.ERROR,
          null,
          expected,
          sql,
          message(exception),
          durationMillis(startedAt, finishedAt)));
      return new RuleOutcome(CheckResult.ERROR);
    }
  }

  private void markRemainingRulesNotRun(ExecutionJob job, int startIndex) {
    for (int index = startIndex; index < job.rules().size(); index++) {
      RuleSnapshot rule = job.rules().get(index);
      repository.insertRuleExecution(new RuleExecutionWrite(
          job.executionId(),
          rule.id(),
          rule.name(),
          rule.templateCode(),
          rule.ruleType(),
          rule.columnName(),
          CheckResult.NOT_RUN,
          null,
          null,
          null,
          "前序规则失败，已按监控策略停止执行",
          0L));
    }
  }

  private static long durationMillis(LocalDateTime start, LocalDateTime end) {
    return Math.max(0L, Duration.between(start, end).toMillis());
  }

  private static String message(Throwable throwable) {
    String message = throwable.getMessage();
    String normalized = message == null || message.isBlank()
        ? throwable.getClass().getSimpleName()
        : message.trim();
    return normalized.length() <= 1000 ? normalized : normalized.substring(0, 1000);
  }

  private record RuleOutcome(CheckResult result) {
  }
}
