package io.yak.ops.web.contract.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class ClientDatasourceVerifyItemVO {

    /**
     * 检查项编码
     */
    private String code;

    /**
     * 检查项名称
     */
    private String name;

    /**
     * 是否通过
     */
    private Boolean success;

    /**
     * 实际值
     */
    private String actualValue;

    /**
     * 期望值
     */
    private String expectedValue;

    /**
     * 说明
     */
    private String message;

    public static ClientDatasourceVerifyItemVO success(
            String code,
            String name,
            String actualValue,
            String expectedValue,
            String message) {
        return new ClientDatasourceVerifyItemVO(
                code,
                name,
                true,
                actualValue,
                expectedValue,
                message
        );
    }

    public static ClientDatasourceVerifyItemVO fail(
            String code,
            String name,
            String actualValue,
            String expectedValue,
            String message) {
        return new ClientDatasourceVerifyItemVO(
                code,
                name,
                false,
                actualValue,
                expectedValue,
                message
        );
    }
}
