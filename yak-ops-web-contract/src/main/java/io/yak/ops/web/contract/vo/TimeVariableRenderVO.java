package io.yak.ops.web.contract.vo;


import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class TimeVariableRenderVO {

    /**
     * 原始内容
     */
    private String originalContent;

    /**
     * 替换后的内容
     */
    private String renderedContent;

    /**
     * 已解析变量
     */
    private List<VariableItem> variables = new ArrayList<>();

    /**
     * 未识别变量
     */
    private List<String> unresolvedVariables = new ArrayList<>();

    @Data
    public static class VariableItem {

        private String name;

        private String value;

        private String source;

        private String expression;

        private String timeFormat;
    }
}
