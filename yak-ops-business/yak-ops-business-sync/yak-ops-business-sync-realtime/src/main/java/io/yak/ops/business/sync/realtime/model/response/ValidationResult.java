package io.yak.ops.business.sync.realtime.model.response;

import java.util.List;

/** 配置校验结果。 */
public record ValidationResult(boolean valid, List<String> messages) {

  public static ValidationResult success() {
    return new ValidationResult(true, List.of());
  }

  public static ValidationResult failure(List<String> messages) {
    return new ValidationResult(false, List.copyOf(messages));
  }
}
