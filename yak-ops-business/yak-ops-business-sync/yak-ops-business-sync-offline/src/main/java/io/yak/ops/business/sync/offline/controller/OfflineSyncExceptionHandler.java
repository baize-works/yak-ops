package io.yak.ops.business.sync.offline.controller;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.model.response.OfflineApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** 离线同步接口异常转换。 */
@ConditionalOnOfflineSyncEnabled
@RestControllerAdvice(basePackages = "io.yak.ops.business.sync.offline.controller")
public class OfflineSyncExceptionHandler {

  @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public OfflineApiResponse<Void> handleBusinessException(RuntimeException exception) {
    return OfflineApiResponse.failure(exception.getMessage());
  }

  @ExceptionHandler(Exception.class)
  @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
  public OfflineApiResponse<Void> handleUnexpectedException(Exception exception) {
    return OfflineApiResponse.failure("离线同步服务异常：" + exception.getMessage());
  }
}
