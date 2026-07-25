package io.yak.ops.application.model.vo;

import lombok.Data;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public class HoconTemplateVO {

    private String sourceDbType;

    private String sourcePluginName;

    private String targetDbType;

    private String targetPluginName;

    private String sourceTemplate;

    private String sinkTemplate;

    private String fullTemplate;
}
