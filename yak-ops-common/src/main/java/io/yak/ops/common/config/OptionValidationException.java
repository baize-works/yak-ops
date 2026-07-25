package io.yak.ops.common.config;



/** Exception for all errors occurring during option validation phase. */
public class OptionValidationException extends LinkUpRuntimeException {

    public OptionValidationException(String message, Throwable cause) {
        super(LinkUpAPIErrorCode.OPTION_VALIDATION_FAILED, message, cause);
    }

    public OptionValidationException(String message) {
        super(LinkUpAPIErrorCode.OPTION_VALIDATION_FAILED, message);
    }

    public OptionValidationException(String formatMessage, Object... args) {
        super(LinkUpAPIErrorCode.OPTION_VALIDATION_FAILED, String.format(formatMessage, args));
    }

    public OptionValidationException(Option<?> option) {
        super(
                LinkUpAPIErrorCode.OPTION_VALIDATION_FAILED,
                String.format(
                        "The option(\"%s\")  is incorrectly configured, please refer to the doc: %s",
                        option.key(), option.getDescription()));
    }
}
