package io.yak.ops.business.job.task;

import java.util.Locale;
import java.util.Map;

/** 工作流观察同步任务执行时使用的最小状态视图。 */
public record SyncTaskExecution(
    String executionId,
    String status,
    String errorMessage,
    Map<String, Object> output) {

  public SyncTaskExecution {
    output = output == null ? Map.of() : Map.copyOf(output);
  }

  public boolean terminal() {
    String normalized = normalizedStatus();
    return "SUCCEEDED".equals(normalized)
        || "FAILED".equals(normalized)
        || "CANCELED".equals(normalized)
        || "LOST".equals(normalized);
  }

  public boolean successful() {
    return "SUCCEEDED".equals(normalizedStatus());
  }

  private String normalizedStatus() {
    return status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
  }
}
