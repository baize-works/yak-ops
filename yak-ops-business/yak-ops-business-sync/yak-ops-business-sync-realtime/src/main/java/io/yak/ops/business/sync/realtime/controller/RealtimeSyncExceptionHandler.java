package io.yak.ops.business.sync.realtime.controller;

import io.yak.ops.business.sync.realtime.config.ConditionalOnRealtimeSyncEnabled;
import io.yak.ops.business.sync.realtime.model.response.RealtimeApiResponse;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** 实时同步接口异常转换。 */
@ConditionalOnRealtimeSyncEnabled
@RestControllerAdvice(basePackages = "io.yak.ops.business.sync.realtime.controller")
public class RealtimeSyncExceptionHandler {

  @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public RealtimeApiResponse<Void> handleBusinessException(RuntimeException exception) {
    return RealtimeApiResponse.failure(exception.getMessage());
  }

  @ExceptionHandler({MethodArgumentNotValidException.class, ConstraintViolationException.class})
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public RealtimeApiResponse<Void> handleValidationException(Exception exception) {
    return RealtimeApiResponse.failure("请求参数校验失败：" + exception.getMessage());
  }
}
