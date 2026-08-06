package io.yak.ops.business.quality.execution;

import io.yak.ops.business.quality.api.QualityApi.ComparisonOperator;
import java.math.BigDecimal;

public class QualityMetricEvaluator {

  public boolean passes(
      ComparisonOperator operator,
      BigDecimal threshold,
      BigDecimal thresholdEnd,
      MetricMeasurement measurement) {
    BigDecimal first = required(measurement.value(), "指标值为空，无法判断质量结果");
    BigDecimal expected = required(threshold, "规则阈值不能为空");
    return switch (operator) {
      case GT -> first.compareTo(expected) > 0;
      case GTE -> first.compareTo(expected) >= 0;
      case EQ -> first.compareTo(expected) == 0
          && (measurement.valueEnd() == null
              || measurement.valueEnd().compareTo(expected) == 0);
      case LTE -> first.compareTo(expected) <= 0;
      case LT -> first.compareTo(expected) < 0;
      case BETWEEN -> {
        BigDecimal end = required(thresholdEnd, "区间规则缺少最大阈值");
        BigDecimal last = measurement.valueEnd() == null
            ? first
            : measurement.valueEnd();
        yield first.compareTo(expected) >= 0 && last.compareTo(end) <= 0;
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

  public static String format(BigDecimal value) {
    if (value == null) {
      return "--";
    }
    BigDecimal normalized = value.stripTrailingZeros();
    return normalized.scale() < 0
        ? normalized.setScale(0).toPlainString()
        : normalized.toPlainString();
  }

  private static BigDecimal required(BigDecimal value, String message) {
    if (value == null) {
      throw new IllegalArgumentException(message);
    }
    return value;
  }

  public record MetricMeasurement(
      BigDecimal value,
      BigDecimal valueEnd,
      String displayValue) {
  }
}
