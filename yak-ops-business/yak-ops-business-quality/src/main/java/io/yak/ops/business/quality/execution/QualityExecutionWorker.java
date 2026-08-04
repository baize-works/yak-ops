package io.yak.ops.business.quality.execution;

import io.yak.ops.business.datasource.service.DataSourceCatalogService;
import io.yak.ops.business.quality.execution.QualityMetricEvaluator.MetricMeasurement;
import io.yak.ops.business.quality.execution.QualitySqlCompiler.CompiledQuery;
import io.yak.ops.business.quality.repository.QualityExecutionRepository.ExecutionRuntime;
import io.yak.ops.business.quality.service.QualityExecutionStateService;
import io.yak.ops.common.bean.vo.datasource.DataSourceQueryResultVO;
import java.util.LinkedHashMap;
import java.util.Map;

public class QualityExecutionWorker {

  private final QualityExecutionStateService stateService;
  private final QualitySqlCompiler sqlCompiler;
  private final QualityMetricEvaluator evaluator;
  private final DataSourceCatalogService catalogService;

  public QualityExecutionWorker(
      QualityExecutionStateService stateService,
      QualitySqlCompiler sqlCompiler,
      QualityMetricEvaluator evaluator,
      DataSourceCatalogService catalogService) {
    this.stateService = stateService;
    this.sqlCompiler = sqlCompiler;
    this.evaluator = evaluator;
    this.catalogService = catalogService;
  }

  public void execute(long executionId) {
    ExecutionRuntime runtime = stateService.start(executionId);
    if (runtime == null) {
      return;
    }

    long startedNanos = System.nanoTime();
    String executedSql = null;
    try {
      CompiledQuery query = sqlCompiler.compile(runtime);
      executedSql = query.sql();
      Map<String, Object> request = new LinkedHashMap<>();
      request.put("read_mode", "sql");
      request.put("query", executedSql);
      DataSourceQueryResultVO result = catalogService.preview(
          parseDataSourceId(runtime.dataSourceId()),
          request);
      MetricMeasurement measurement = sqlCompiler.measure(query, result);
      boolean passed = evaluator.passes(
          runtime.operator(),
          runtime.threshold(),
          runtime.thresholdEnd(),
          measurement);
      stateService.complete(
          runtime,
          measurement,
          passed,
          query.expectedDisplay(),
          executedSql,
          elapsedMillis(startedNanos));
    } catch (Exception exception) {
      stateService.fail(
          runtime,
          executedSql,
          safeMessage(exception),
          elapsedMillis(startedNanos));
    }
  }

  private static long parseDataSourceId(String value) {
    try {
      long id = Long.parseLong(value);
      if (id <= 0) {
        throw new NumberFormatException("non-positive");
      }
      return id;
    } catch (NumberFormatException exception) {
      throw new IllegalArgumentException("数据源编号无效：" + value, exception);
    }
  }

  private static long elapsedMillis(long startedNanos) {
    return Math.max(0L, (System.nanoTime() - startedNanos) / 1_000_000L);
  }

  private static String safeMessage(Exception exception) {
    Throwable current = exception;
    while (current.getCause() != null && current.getCause() != current) {
      current = current.getCause();
    }
    String message = current.getMessage();
    if (message == null || message.isBlank()) {
      message = current.getClass().getSimpleName();
    }
    String sanitized = message.replaceAll(
        "(?i)(password|pwd|secret|token)=([^;&\\s]+)",
        "$1=******");
    return sanitized.length() > 1000 ? sanitized.substring(0, 1000) : sanitized;
  }
}
