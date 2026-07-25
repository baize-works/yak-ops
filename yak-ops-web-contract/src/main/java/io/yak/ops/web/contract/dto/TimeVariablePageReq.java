package io.yak.ops.web.contract.dto;

import lombok.Data;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class TimeVariablePageReq {

    private Integer pageNo = 1;

    private Integer pageSize = 10;

    /**
     * 关键词：变量名 / 说明 / 表达式
     */
    private String keyword;

    /**
     * SYSTEM / CUSTOM
     */
    private String variableSource;

    /**
     * FIXED / DYNAMIC
     */
    private String valueType;

    private Boolean enabled;
}
