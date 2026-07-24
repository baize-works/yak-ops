package io.baize.flow.api.handler;

import io.baize.flow.web.contract.response.Result;
import io.baize.flow.common.utils.ConvertUtil;
import io.baize.flow.web.contract.response.ResultStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.support.DefaultMessageSourceResolvable;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Global exception handler for REST controllers.
 *
 * <p>
 * This class centralizes exception handling for common cases like:
 * </p>
 * <ul>
 *     <li>Method argument validation failures</li>
 *     <li>Null pointer exceptions</li>
 *     <li>Other uncaught exceptions</li>
 * </ul>
 *
 * <p>
 * It converts exceptions into consistent {@link Result} responses
 * with proper logging.
 * </p>
 */
@RestControllerAdvice
public class CustomGlobalExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(CustomGlobalExceptionHandler.class);

    /**
     * Handle validation errors from {@link org.springframework.web.bind.annotation.RequestBody}
     * or @Valid annotated parameters.
     *
     * @param me the MethodArgumentNotValidException
     * @return Result with PARAM_ILLEGAL status and concatenated error messages
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public Result<Void> methodArgumentNotValidException(MethodArgumentNotValidException me) {
        // Extract all field errors
        List<FieldError> fieldErrorList = me.getBindingResult().getFieldErrors();

        // Convert error messages into a single comma-separated string
        List<String> errorList = fieldErrorList.stream()
                .map(DefaultMessageSourceResolvable::getDefaultMessage)
                .collect(Collectors.toList());

        return Result.buildFromRSAndMsg(
                ResultStatus.PARAM_ILLEGAL,
                ConvertUtil.list2String(errorList, ",")
        );
    }

    /**
     * Handle NullPointerExceptions globally.
     *
     * @param e the exception
     * @return Result indicating failure with a generic message
     */
    @ExceptionHandler(NullPointerException.class)
    public Result<Void> handleNullPointerException(Exception e) {
        LOGGER.error("method=handleNullPointerException || errMsg=exception", e);
        return Result.buildFromRSAndMsg(ResultStatus.FAIL, "Service encountered a null pointer exception");
    }

    /**
     * Catch-all handler for any other exceptions not explicitly handled.
     *
     * @param e the exception
     * @return Result indicating failure with the exception's message
     */
    @ExceptionHandler(Exception.class)
    public Result<Void> handleException(Exception e) {
        LOGGER.error("method=handleException || errMsg=exception", e);
        return Result.buildFromRSAndMsg(ResultStatus.FAIL, e.getMessage());
    }
}
