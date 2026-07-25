package io.yak.ops.application.model.dto.config;

import lombok.Data;

import java.util.Map;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public class ScriptJobContent {

    /**
     * 比如 HOCON
     */
    private String scriptType;

    /**
     * 脚本文本
     */
    private String hoconContent;

}

