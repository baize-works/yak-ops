package io.yak.ops.application.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "Option information")
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public class OptionVO {

    @Schema(description = "Option value", example = "users", requiredMode = Schema.RequiredMode.REQUIRED)
    private Object value;

    @Schema(description = "Option label", example = "Users Table")
    private String label;

    @Schema(description = "Option description", example = "Table storing user information")
    private String description;
}
