package io.yak.ops.common.config;

/** LinkUp connector error code interface */
public interface LinkUpErrorCode {
    /**
     * Get error code
     *
     * @return error code
     */
    String getCode();

    /**
     * Get error description
     *
     * @return error description
     */
    String getDescription();

    default String getErrorMessage() {
        return String.format("ErrorCode:[%s], ErrorDescription:[%s]", getCode(), getDescription());
    }
}
