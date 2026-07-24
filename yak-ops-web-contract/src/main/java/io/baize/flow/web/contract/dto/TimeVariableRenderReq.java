package io.baize.flow.web.contract.dto;

import lombok.Data;

import java.util.Map;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class TimeVariableRenderReq {

    /**
     * HOCON 或 SQL 内容
     */
    private String content;

    /**
     * 基准时间。
     * 不传则使用当前时间。
     */
    private String baseTime;

    /**
     * 手动覆盖变量。
     * 优先级最高。
     *
     * 例如：
     * {
     *   "biz_date": "2026-05-01"
     * }
     */
    private Map<String, String> overrideVariables;
}
