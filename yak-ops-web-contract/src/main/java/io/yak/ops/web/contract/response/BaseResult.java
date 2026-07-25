package io.yak.ops.web.contract.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.ToString;
import io.yak.ops.common.constants.Constants;

import java.io.Serializable;

@Data
@ToString
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class BaseResult implements Serializable {

    private static final long serialVersionUID = -5771016784021901099L;

    @Schema(description = "Status code", example = "200", requiredMode = Schema.RequiredMode.REQUIRED)
    private Integer code;

    @Schema(description = "Response message", example = "Success")
    private String message;


    public boolean successful() {
        return !this.failed();
    }

    public boolean failed() {
        return !Constants.SUCCESS.equals(code);
    }
}
