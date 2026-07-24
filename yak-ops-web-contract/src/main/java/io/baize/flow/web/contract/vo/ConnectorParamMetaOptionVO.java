package io.baize.flow.web.contract.vo;


import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "Connector parameter option")
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class ConnectorParamMetaOptionVO {

    @Schema(description = "Option value, same as paramName", example = "fetch_size")
    private String value;

    @Schema(description = "Option label", example = "抓取大小")
    private String label;

    @Schema(description = "Parameter description")
    private String description;

    @Schema(description = "Default value", example = "1000")
    private String defaultValue;

    @Schema(description = "Example value", example = "2048")
    private String exampleValue;

    @Schema(description = "Parameter type", example = "number")
    private String paramType;

    @Schema(description = "Required flag: 0 false, 1 true")
    private Integer requiredFlag;
}