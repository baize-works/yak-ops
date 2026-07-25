package io.yak.ops.application.model.dto;

import lombok.Data;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public class TimeVariableSaveReq {

    private Long id;

    private String paramName;

    private String paramDesc;

    /**
     * SYSTEM / CUSTOM
     * 前端新增一般传 CUSTOM
     */
    private String variableSource;

    /**
     * FIXED / DYNAMIC
     */
    private String valueType;

    private String timeFormat;

    private String defaultValue;

    private String expression;

    private String exampleValue;

    private Boolean enabled;

    private String remark;
}
