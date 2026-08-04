package io.yak.ops.business.quality.controller.v1;

import io.yak.ops.business.quality.config.ConditionalOnQualityEnabled;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@ConditionalOnQualityEnabled
@RestControllerAdvice(assignableTypes = QualityRuleController.class)
public class QualityRuleExceptionHandler {

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Map<String, Object>> handleInvalidRequest(
      IllegalArgumentException exception) {
    HttpStatus status = exception.getMessage() != null
            && exception.getMessage().startsWith("质量规则不存在")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("code", status.value());
    body.put("message", exception.getMessage());
    return ResponseEntity.status(status).body(body);
  }
}
