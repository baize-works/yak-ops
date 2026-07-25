
package io.yak.ops.application.metrics.model;

import java.util.Objects;

/**
 * 指标展示缩放配置。
 *
 * <p>用于将原始指标值按照指定比例转换为更易读的展示值。</p>
 *
 * <p>例如：</p>
 * <pre>
 * 原始值：10_485_760 Bytes
 * factor：1_048_576
 * unit：MB
 *
 * 展示值：10 MB
 * </pre>
 */
public final class Scale {

    /**
     * 缩放因子。
     *
     * <p>展示值 = 原始值 / factor。</p>
     */
    private final double factor;

    /**
     * 缩放后的展示单位。
     */
    private final String unit;

    public Scale(double factor, String unit) {
        if (Double.isNaN(factor)
                || Double.isInfinite(factor)
                || factor <= 0D) {
            throw new IllegalArgumentException(
                    "factor must be a finite number greater than 0");
        }

        this.factor = factor;
        this.unit = Objects.requireNonNull(unit, "unit must not be null");
    }

    public double getFactor() {
        return factor;
    }

    public String getUnit() {
        return unit;
    }

    @Override
    public String toString() {
        return "Scale{"
                + "factor=" + factor
                + ", unit='" + unit + '\''
                + '}';
    }
}