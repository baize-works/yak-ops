package io.yak.ops.business.quality.execution;

import static org.assertj.core.api.Assertions.assertThat;

import io.yak.ops.business.quality.api.QualityRuleApi.ComparisonOperator;
import io.yak.ops.business.quality.execution.QualityMetricEvaluator.MetricMeasurement;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class QualityMetricEvaluatorTest {

  private final QualityMetricEvaluator evaluator = new QualityMetricEvaluator();

  @Test
  void comparesScalarMetrics() {
    assertThat(evaluator.passes(
        ComparisonOperator.GTE,
        new BigDecimal("99"),
        null,
        new MetricMeasurement(new BigDecimal("99.10"), null, "99.1%")))
        .isTrue();
    assertThat(evaluator.passes(
        ComparisonOperator.LT,
        new BigDecimal("2"),
        null,
        new MetricMeasurement(new BigDecimal("3"), null, "3小时")))
        .isFalse();
  }

  @Test
  void checksTheWholeObservedRange() {
    assertThat(evaluator.passes(
        ComparisonOperator.BETWEEN,
        BigDecimal.ZERO,
        BigDecimal.TEN,
        new MetricMeasurement(
            new BigDecimal("0.1"),
            new BigDecimal("9.9"),
            "0.1 ~ 9.9")))
        .isTrue();
    assertThat(evaluator.passes(
        ComparisonOperator.BETWEEN,
        BigDecimal.ZERO,
        BigDecimal.TEN,
        new MetricMeasurement(
            new BigDecimal("-1"),
            new BigDecimal("9.9"),
            "-1 ~ 9.9")))
        .isFalse();
  }
}
