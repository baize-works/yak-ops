package io.yak.ops.plugin.spi.form;

import lombok.Data;

/**
 * 选项配置（用于SELECT）
 */
@Data
public class Option {
    private String label;
    private Object value;
}
