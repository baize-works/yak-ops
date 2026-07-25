package io.yak.ops.plugin.spi.form;

import lombok.Data;

/**
 * 验证规则
 */
@Data
public class Rule {
    private String pattern; // 正则表达式
    private String message; // 错误提示
    private Integer min;    // 最小值（用于NUMBER）
    private Integer max;    // 最大值（用于NUMBER）
    private Boolean required;    // 是否要求
}
