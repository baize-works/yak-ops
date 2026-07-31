package io.yak.ops.business.sync.offline.controller;

import io.yak.framework.common.BusinessException;
import io.yak.framework.common.Result;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** 离线同步接口异常转换。 */
@ConditionalOnOfflineSyncEnabled
@RestControllerAdvice(basePackages = "io.yak.ops.business.sync.offline.controller")
public class OfflineSyncExceptionHandler {

  @ExceptionHandler(BusinessException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public Result<Void> handleBusinessException(BusinessException exception) {
    return Result.fail(exception);
  }

  @ExceptionHandler({MethodArgumentNotValidException.class, BindException.class})
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public Result<Void> handleValidationException(Exception exception) {
    org.springframework.validation.BindingResult bindingResult;
    if (exception instanceof MethodArgumentNotValidException) {
      bindingResult = ((MethodArgumentNotValidException) exception).getBindingResult();
    } else {
      bindingResult = ((BindException) exception).getBindingResult();
    }

    String message = bindingResult.getFieldErrors().stream()
            .map(error -> error.getDefaultMessage() == null ? error.getField() : error.getDefaultMessage())
            .distinct()
            .collect(Collectors.joining("；"));

    return Result.buildParamIllegal(message);
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public Result<Void> handleUnreadableMessage(HttpMessageNotReadableException exception) {
    return Result.buildParamIllegal("请求体格式或字段类型不正确");
  }

  @ExceptionHandler(IllegalArgumentException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public Result<Void> handleIllegalArgumentException(IllegalArgumentException exception) {
    return Result.buildParamIllegal(exception.getMessage());
  }

  @ExceptionHandler(IllegalStateException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public Result<Void> handleIllegalStateException(IllegalStateException exception) {
    return Result.fail(exception.getMessage());
  }

  @ExceptionHandler(Exception.class)
  @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
  public Result<Void> handleUnexpectedException(Exception exception) {
    return Result.fail("离线同步服务异常：" + exception.getMessage());
  }
}
