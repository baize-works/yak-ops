package io.yak.ops.web.contract.dto.config;

import lombok.Data;

import java.util.Map;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
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

