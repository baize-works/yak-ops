package io.yak.ops.api.exceptions;

import javax.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import io.yak.ops.domain.exceptions.ServiceException;
import io.yak.ops.application.model.response.Result;
import io.yak.ops.plugin.spi.enums.Status;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerMapping;
import org.springframework.web.servlet.NoHandlerFoundException;

/**
 * Global Exception Handler
 */
@RestControllerAdvice
@ResponseBody
@Slf4j
public class ApiExceptionHandler {

    /**
     * Business exception
     */
    @ExceptionHandler(ServiceException.class)
    public Result<Object> handleServiceException(ServiceException e, HttpServletRequest request) {
        HandlerMethod handlerMethod = getHandlerMethod(request);
        if (handlerMethod != null) {
            log.error("{} Meet a ServiceException: {}", handlerMethod.getShortLogMessage(), e.getMessage(), e);
        } else {
            log.error("Meet a ServiceException: {}", e.getMessage(), e);
        }
        return new Result<>(e.getCode(), e.getMessage());
    }

    /**
     * Static resource not found
     * Avoid printing ERROR logs repeatedly for wrong swagger/static resource paths
     */
    @ExceptionHandler(NoHandlerFoundException.class)
    public Result<Object> handleNoResourceFoundException(NoHandlerFoundException e,
                                                         HttpServletRequest request) {
        log.warn("Static resource not found, uri={}, resourcePath={}",
                request.getRequestURI(), e.getMessage());
        return Result.errorWithArgs(Status.INTERNAL_SERVER_ERROR_ARGS, "Resource not found");
    }

    /**
     * Internal failures, including persistence and result mapping failures.
     */
    @ExceptionHandler(Exception.class)
    public Result<Object> handleInternalException(Exception e, HttpServletRequest request) {
        HandlerMethod handlerMethod = getHandlerMethod(request);
        if (handlerMethod != null) {
            log.error("{} Meet an internal exception", handlerMethod.getShortLogMessage(), e);
        } else {
            log.error("Meet an internal exception, uri={}", request.getRequestURI(), e);
        }
        return Result.errorWithArgs(Status.INTERNAL_SERVER_ERROR_ARGS, "Internal server error");
    }

    /**
     * @Valid validation failed
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public Result<Object> handleMethodArgumentNotValidException(MethodArgumentNotValidException e,
                                                                HttpServletRequest request) {
        logWarnWithHandler(request, "Meet a MethodArgumentNotValidException", e);
        String message = extractBindingMessage(e.getBindingResult() != null
                ? e.getBindingResult().getFieldError() != null
                ? e.getBindingResult().getFieldError().getDefaultMessage()
                : null
                : null);
        return Result.errorWithArgs(Status.REQUEST_PARAMS_NOT_VALID_ERROR, message);
    }

    /**
     * Parameter binding failed
     */
    @ExceptionHandler(BindException.class)
    public Result<Object> handleBindException(BindException e, HttpServletRequest request) {
        logWarnWithHandler(request, "Meet a BindException", e);
        String message = extractBindingMessage(e.getBindingResult() != null
                ? e.getBindingResult().getFieldError() != null
                ? e.getBindingResult().getFieldError().getDefaultMessage()
                : null
                : null);
        return Result.errorWithArgs(Status.REQUEST_PARAMS_NOT_VALID_ERROR, message);
    }

    /**
     * Missing request parameter
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public Result<Object> handleMissingServletRequestParameterException(
            MissingServletRequestParameterException e,
            HttpServletRequest request) {
        logWarnWithHandler(request, "Meet a MissingServletRequestParameterException", e);
        return Result.errorWithArgs(
                Status.REQUEST_PARAMS_NOT_VALID_ERROR,
                "Missing required parameter: " + e.getParameterName()
        );
    }

    /**
     * Request body parse failed
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public Result<Object> handleHttpMessageNotReadableException(HttpMessageNotReadableException e,
                                                                HttpServletRequest request) {
        logWarnWithHandler(request, "Meet a HttpMessageNotReadableException", e);
        return Result.errorWithArgs(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "Request body format error");
    }

    /**
     * Unknown exception
     */
    @ExceptionHandler(Throwable.class)
    public Result<Object> handleThrowable(Throwable e, HttpServletRequest request) {
        ApiException apiException = getApiException(request);

        log.error("Meet an unknown exception", e);

        String message = e.getMessage() == null ? "Internal server error" : e.getMessage();

        if (apiException == null) {
            return Result.errorWithArgs(Status.INTERNAL_SERVER_ERROR_ARGS, message);
        }

        Status status = apiException.value();
        return new Result<>(status.getCode(), status.getMsg() + ":" + message);
    }

    private HandlerMethod getHandlerMethod(HttpServletRequest request) {
        Object handler = request.getAttribute(HandlerMapping.BEST_MATCHING_HANDLER_ATTRIBUTE);
        if (handler instanceof HandlerMethod) {
            return (HandlerMethod) handler;
        }
        return null;
    }

    private ApiException getApiException(HttpServletRequest request) {
        HandlerMethod handlerMethod = getHandlerMethod(request);
        if (handlerMethod == null) {
            return null;
        }
        return handlerMethod.getMethodAnnotation(ApiException.class);
    }

    private void logWarnWithHandler(HttpServletRequest request, String message, Exception e) {
        HandlerMethod handlerMethod = getHandlerMethod(request);
        if (handlerMethod != null) {
            log.warn("{} - {}", handlerMethod.getShortLogMessage(), message, e);
        } else {
            log.warn(message, e);
        }
    }

    private String extractBindingMessage(String message) {
        if (message == null || message.trim().isEmpty()) {
            return "Request parameter validation failed";
        }
        return message;
    }
}
