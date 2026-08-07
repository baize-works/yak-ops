package io.yak.ops.business.quality.controller.v1;

import io.yak.ops.business.quality.config.ConditionalOnQualityEnabled;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@ConditionalOnQualityEnabled
@RestControllerAdvice(assignableTypes = {
    QualityTemplateController.class,
    CustomTemplateController.class,
    QualityMonitorController.class,
    QualityExecutionController.class
})
public class QualityExceptionHandler {

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Map<String, Object>> handleInvalid(
      IllegalArgumentException exception) {
    String message = exception.getMessage();
    HttpStatus status = message != null
            && (message.startsWith("规则模板不存在")
                || message.startsWith("自定义规则模板不存在")
                || message.startsWith("规则模板目录不存在")
                || message.startsWith("质量监控不存在")
                || message.startsWith("质量执行记录不存在"))
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
    return response(status, message);
  }

  @ExceptionHandler(IllegalStateException.class)
  public ResponseEntity<Map<String, Object>> handleConflict(
      IllegalStateException exception) {
    return response(HttpStatus.CONFLICT, exception.getMessage());
  }

  private static ResponseEntity<Map<String, Object>> response(
      HttpStatus status,
      String message) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("code", status.value());
    body.put("message", message == null ? status.getReasonPhrase() : message);
    return ResponseEntity.status(status).body(body);
  }
}
