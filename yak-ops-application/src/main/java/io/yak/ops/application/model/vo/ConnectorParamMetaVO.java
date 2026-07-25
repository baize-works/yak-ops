package io.yak.ops.application.model.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public class ConnectorParamMetaVO {

    private Long id;

    private String type;

    private String connectorName;

    private String connectorType;

    private String paramName;

    private String paramDesc;

    private String paramType;

    private Integer requiredFlag;

    private String defaultValue;

    private String exampleValue;

    private String paramContext;

    private String remark;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
