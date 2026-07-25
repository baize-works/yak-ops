package io.yak.ops.web.contract.vo;

import lombok.Data;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class HoconTemplateVO {

    private String sourceDbType;

    private String sourcePluginName;

    private String targetDbType;

    private String targetPluginName;

    private String sourceTemplate;

    private String sinkTemplate;

    private String fullTemplate;
}
