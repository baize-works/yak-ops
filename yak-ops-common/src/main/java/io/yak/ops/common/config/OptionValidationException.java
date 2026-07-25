package io.yak.ops.common.config;



/** Exception for all errors occurring during option validation phase. */
public class OptionValidationException extends SeaTunnelRuntimeException {

    public OptionValidationException(String message, Throwable cause) {
        super(SeaTunnelAPIErrorCode.OPTION_VALIDATION_FAILED, message, cause);
    }

    public OptionValidationException(String message) {
        super(SeaTunnelAPIErrorCode.OPTION_VALIDATION_FAILED, message);
    }

    public OptionValidationException(String formatMessage, Object... args) {
        super(SeaTunnelAPIErrorCode.OPTION_VALIDATION_FAILED, String.format(formatMessage, args));
    }

    public OptionValidationException(Option<?> option) {
        super(
                SeaTunnelAPIErrorCode.OPTION_VALIDATION_FAILED,
                String.format(
                        "The option(\"%s\")  is incorrectly configured, please refer to the doc: %s",
                        option.key(), option.getDescription()));
    }
}
