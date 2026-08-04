package io.yak.ops.business.development.controller.v1;

import io.yak.ops.business.development.config.ConditionalOnDataDevelopmentEnabled;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Maps authoring conflicts to HTTP 409 so the workbench can surface a refresh action. */
@ConditionalOnDataDevelopmentEnabled
@RestControllerAdvice(assignableTypes = DataDevelopmentController.class)
public class DataDevelopmentExceptionHandler {

  @ExceptionHandler(IllegalStateException.class)
  public ResponseEntity<Map<String, Object>> handleConflict(IllegalStateException exception) {
    return response(HttpStatus.CONFLICT, exception.getMessage());
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Map<String, Object>> handleInvalidRequest(
      IllegalArgumentException exception) {
    HttpStatus status = isRevisionConflict(exception.getMessage())
        ? HttpStatus.CONFLICT
        : HttpStatus.BAD_REQUEST;
    return response(status, exception.getMessage());
  }

  private static boolean isRevisionConflict(String message) {
    return message != null
        && (message.contains("revision") || message.contains("draftRevision"));
  }

  private static ResponseEntity<Map<String, Object>> response(
      HttpStatus status,
      String message) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("code", status.value());
    body.put("message", message);
    return ResponseEntity.status(status).body(body);
  }
}
