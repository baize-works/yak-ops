package io.yak.ops.business.datasource.exception;

import io.yak.framework.common.Result;
import io.yak.ops.business.datasource.common.enums.DataSourceErrorCode;
import io.yak.ops.business.datasource.config.ConditionalOnDataSourceEnabled;
import io.yak.ops.business.datasource.controller.DataSourceController;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** 数据源管理接口异常转换。 */
@Slf4j
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(basePackageClasses = DataSourceController.class)
@ConditionalOnDataSourceEnabled
public class DataSourceExceptionHandler {

  @ExceptionHandler(DataSourceException.class)
  public Result<Void> handleDataSourceException(DataSourceException exception) {
    if (exception.getErrorCode() == null) {
      return Result.fail(exception.getUserMessage());
    }
    return Result.fail(exception.getErrorCode().getCode(), exception.getUserMessage());
  }

  @ExceptionHandler({
      MethodArgumentNotValidException.class,
      BindException.class,
      HttpMessageNotReadableException.class
  })
  public Result<Void> handleInvalidRequest(Exception exception) {
    return Result.buildParamIllegal(resolveValidationMessage(exception));
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  public Result<Void> handleDataIntegrityViolation(DataIntegrityViolationException exception) {
    log.warn("Datasource persistence constraint violation", exception);
    return Result.fail(
        DataSourceErrorCode.DUPLICATE_NAME.getCode(),
        DataSourceErrorCode.DUPLICATE_NAME.getMessage());
  }

  @ExceptionHandler(Exception.class)
  public Result<Void> handleUnexpectedException(Exception exception) {
    log.error("Unexpected datasource management error", exception);
    return Result.fail("数据源操作失败，请稍后重试");
  }

  private String resolveValidationMessage(Exception exception) {
    if (exception instanceof MethodArgumentNotValidException validationException
        && validationException.getBindingResult().getFieldError() != null) {
      return validationException.getBindingResult().getFieldError().getDefaultMessage();
    }
    if (exception instanceof BindException bindException
        && bindException.getBindingResult().getFieldError() != null) {
      return bindException.getBindingResult().getFieldError().getDefaultMessage();
    }
    return "请求参数格式不正确";
  }
}
