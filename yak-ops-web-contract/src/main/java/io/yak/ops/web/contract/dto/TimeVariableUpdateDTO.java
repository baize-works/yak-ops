package io.yak.ops.web.contract.dto;

import lombok.Data;

import java.io.Serializable;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class TimeVariableUpdateDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 变量名称，如 biz_date / start_time / end_time
     */
    private String paramName;

    /**
     * 变量说明
     */
    private String paramDesc;

    /**
     * 取值方式：FIXED / DYNAMIC
     */
    private String valueType;

    /**
     * 时间格式，如 yyyy-MM-dd HH:mm:ss
     */
    private String timeFormat;

    /**
     * 默认值。
     *
     * FIXED 模式下必填。
     */
    private String defaultValue;

    /**
     * 动态表达式。
     *
     * DYNAMIC 模式下必填，如 schedule_time-1d@day_start
     */
    private String expression;

    /**
     * 示例值
     */
    private String exampleValue;

    /**
     * 是否启用
     */
    private Boolean enabled;

    /**
     * 备注
     */
    private String remark;
}
