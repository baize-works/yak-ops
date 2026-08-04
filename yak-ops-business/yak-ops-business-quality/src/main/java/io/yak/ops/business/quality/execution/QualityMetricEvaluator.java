package io.yak.ops.business.quality.execution;

import io.yak.ops.business.quality.api.QualityRuleApi.ComparisonOperator;
import java.math.BigDecimal;

public class QualityMetricEvaluator {

  public boolean passes(
      ComparisonOperator operator,
      BigDecimal threshold,
      BigDecimal thresholdEnd,
      MetricMeasurement measurement) {
    BigDecimal first = required(measurement.value(), "指标值为空，无法判断质量结果");
    return switch (operator) {
      case GT -> first.compareTo(threshold) > 0;
      case GTE -> first.compareTo(threshold) >= 0;
      case EQ -> first.compareTo(threshold) == 0
          && (measurement.valueEnd() == null
              || measurement.valueEnd().compareTo(threshold) == 0);
      case LTE -> first.compareTo(threshold) <= 0;
      case LT -> first.compareTo(threshold) < 0;
      case BETWEEN -> {
        if (thresholdEnd == null) {
          throw new IllegalArgumentException("区间规则缺少最大阈值");
        }
        BigDecimal last = measurement.valueEnd() == null
            ? first
            : measurement.valueEnd();
        yield first.compareTo(threshold) >= 0 && last.compareTo(thresholdEnd) <= 0;
      }
    };
  }

  public String expectedValue(
      ComparisonOperator operator,
      BigDecimal threshold,
      BigDecimal thresholdEnd,
      String unit) {
    String suffix = unit == null ? "" : unit;
    if (operator == ComparisonOperator.BETWEEN) {
      return format(threshold) + " ~ " + format(thresholdEnd) + suffix;
    }
    return operator.symbol() + " " + format(threshold) + suffix;
  }

  private static BigDecimal required(BigDecimal value, String message) {
    if (value == null) {
      throw new IllegalArgumentException(message);
    }
    return value;
  }

  private static String format(BigDecimal value) {
    if (value == null) {
      return "--";
    }
    BigDecimal normalized = value.stripTrailingZeros();
    return normalized.scale() < 0
        ? normalized.setScale(0).toPlainString()
        : normalized.toPlainString();
  }

  public record MetricMeasurement(
      BigDecimal value,
      BigDecimal valueEnd,
      String displayValue) {
  }
}
