package io.yak.ops.business.quality.execution;

import static org.assertj.core.api.Assertions.assertThat;

import io.yak.ops.business.quality.api.QualityApi.ComparisonOperator;
import io.yak.ops.business.quality.execution.QualityMetricEvaluator.MetricMeasurement;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class QualityMetricEvaluatorTest {

  private final QualityMetricEvaluator evaluator = new QualityMetricEvaluator();

  @Test
  void evaluatesThresholdAndRangeOperators() {
    assertThat(evaluator.passes(
        ComparisonOperator.GT,
        BigDecimal.ZERO,
        null,
        new MetricMeasurement(BigDecimal.ONE, null, "1")))
        .isTrue();
    assertThat(evaluator.passes(
        ComparisonOperator.BETWEEN,
        BigDecimal.ONE,
        BigDecimal.TEN,
        new MetricMeasurement(BigDecimal.valueOf(5), null, "5")))
        .isTrue();
    assertThat(evaluator.passes(
        ComparisonOperator.EQ,
        BigDecimal.ZERO,
        null,
        new MetricMeasurement(BigDecimal.ONE, null, "1")))
        .isFalse();
  }
}
