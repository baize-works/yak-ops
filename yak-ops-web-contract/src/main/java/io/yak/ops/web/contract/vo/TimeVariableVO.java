package io.yak.ops.web.contract.vo;


import lombok.Data;

import java.time.LocalDateTime;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class TimeVariableVO {

    private Long id;

    private String paramName;

    private String paramDesc;

    private String variableSource;

    private String valueType;

    private String timeFormat;

    private String defaultValue;

    private String expression;

    private String exampleValue;

    private Boolean enabled;

    private String remark;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
