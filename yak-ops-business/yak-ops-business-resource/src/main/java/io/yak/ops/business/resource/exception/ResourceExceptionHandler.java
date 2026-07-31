package io.yak.ops.business.resource.exception;

import io.yak.framework.common.ErrorCode;
import io.yak.framework.common.Result;
import io.yak.framework.security.common.enums.ResultCode;
import io.yak.framework.security.exception.YakSecurityException;
import io.yak.ops.business.resource.config.ConditionalOnResourceEnabled;
import io.yak.ops.business.resource.controller.v1.ResourcesController;
import io.yak.ops.common.enums.resource.ResourceErrorCode;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

/** 资源管理接口异常转换。 */
@Slf4j
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(basePackageClasses = ResourcesController.class)
@ConditionalOnResourceEnabled
public class ResourceExceptionHandler {

  @ExceptionHandler(YakSecurityException.class)
  public ResponseEntity<Result<Void>> handleSecurityException(
      YakSecurityException exception) {
    ErrorCode errorCode = exception.getErrorCode();
    Result<Void> body = errorCode == null
        ? Result.fail(exception)
        : Result.fail(errorCode.getCode(), errorCode.getMessage());
    HttpStatus status = errorCode == ResultCode.NO_PERMISSION
        ? HttpStatus.FORBIDDEN
        : HttpStatus.UNAUTHORIZED;
    return ResponseEntity.status(status).body(body);
  }

  @ExceptionHandler(ResourceException.class)
  public Result<Void> handleResourceException(ResourceException exception) {
    if (exception.getErrorCode() == null) {
      return Result.fail(exception.getUserMessage());
    }
    return Result.fail(
        exception.getErrorCode().getCode(),
        exception.getUserMessage());
  }

  @ExceptionHandler({
    MethodArgumentNotValidException.class,
    BindException.class,
    HttpMessageNotReadableException.class
  })
  public Result<Void> handleInvalidRequest(Exception exception) {
    return Result.buildParamIllegal(resolveValidationMessage(exception));
  }

  @ExceptionHandler(ConstraintViolationException.class)
  public Result<Void> handleConstraintViolation(ConstraintViolationException exception) {
    return Result.buildParamIllegal(exception.getMessage());
  }

  @ExceptionHandler(MaxUploadSizeExceededException.class)
  public Result<Void> handleMaxUploadSize(MaxUploadSizeExceededException exception) {
    return Result.fail(
        ResourceErrorCode.FILE_TOO_LARGE.getCode(),
        ResourceErrorCode.FILE_TOO_LARGE.getMessage());
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  public Result<Void> handleDataIntegrityViolation(
      DataIntegrityViolationException exception) {
    log.warn("Resource persistence constraint violation", exception);
    return Result.fail(
        ResourceErrorCode.DUPLICATE_NAME.getCode(),
        ResourceErrorCode.DUPLICATE_NAME.getMessage());
  }

  @ExceptionHandler(Exception.class)
  public Result<Void> handleUnexpectedException(Exception exception) {
    log.error("Unexpected resource management error", exception);
    return Result.fail("资源操作失败，请稍后重试");
  }

  private String resolveValidationMessage(Exception exception) {
    BindingResult bindingResult = null;
    if (exception instanceof MethodArgumentNotValidException) {
      bindingResult = ((MethodArgumentNotValidException) exception).getBindingResult();
    } else if (exception instanceof BindException) {
      bindingResult = ((BindException) exception).getBindingResult();
    }
    if (bindingResult != null && bindingResult.getFieldError() != null) {
      return bindingResult.getFieldError().getDefaultMessage();
    }
    return "请求参数格式不正确";
  }
}
