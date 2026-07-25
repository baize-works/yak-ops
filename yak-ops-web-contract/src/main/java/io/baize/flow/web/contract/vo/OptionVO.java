package io.baize.flow.web.contract.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "Option information")
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class OptionVO {

    @Schema(description = "Option value", example = "users", requiredMode = Schema.RequiredMode.REQUIRED)
    private Object value;

    @Schema(description = "Option label", example = "Users Table")
    private String label;

    @Schema(description = "Option description", example = "Table storing user information")
    private String description;
}
