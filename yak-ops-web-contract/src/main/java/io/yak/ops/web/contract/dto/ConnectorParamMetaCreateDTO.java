package io.yak.ops.web.contract.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class ConnectorParamMetaCreateDTO {

    @NotBlank(message = "type不能为空")
    @Size(max = 32, message = "type长度不能超过32")
    private String type;

    @NotBlank(message = "connectorName不能为空")
    @Size(max = 128, message = "connectorName长度不能超过128")
    private String connectorName;
    private String connectorType;

    @NotBlank(message = "paramName不能为空")
    @Size(max = 128, message = "paramName长度不能超过128")
    private String paramName;

    @Size(max = 512, message = "paramDesc长度不能超过512")
    private String paramDesc;

    @Size(max = 64, message = "paramType长度不能超过64")
    private String paramType;

    @NotNull(message = "requiredFlag不能为空")
    private Integer requiredFlag;

    @Size(max = 512, message = "defaultValue长度不能超过512")
    private String defaultValue;

    @Size(max = 1000, message = "exampleValue长度不能超过1000")
    private String exampleValue;

    /**
     * JSON字符串，保存参数的深度上下文
     */
    private String paramContext;

    @Size(max = 512, message = "remark长度不能超过512")
    private String remark;
}
