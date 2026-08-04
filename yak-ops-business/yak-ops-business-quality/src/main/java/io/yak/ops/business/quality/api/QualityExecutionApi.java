package io.yak.ops.business.quality.api;

import io.yak.ops.business.quality.api.QualityRuleApi.RuleType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.LocalDateTime;
import java.util.List;

public final class QualityExecutionApi {

  private QualityExecutionApi() {
  }

  public enum TriggerType {
    MANUAL,
    SCHEDULE
  }

  public enum ExecutionStatus {
    WAITING,
    RUNNING,
    SUCCESS,
    FAILED
  }

  public enum CheckResult {
    PASSED,
    NOT_PASSED,
    UNKNOWN
  }

  public record ExecutionPageRequest(
      @Min(1) Integer current,
      @Min(1) @Max(100) Integer pageSize,
      String keyword,
      ExecutionStatus status,
      CheckResult checkResult,
      TriggerType triggerType) {

    public int normalizedCurrent() {
      return current == null ? 1 : current;
    }

    public int normalizedPageSize() {
      return pageSize == null ? 10 : pageSize;
    }
  }

  public record ExecutionSummary(
      long total,
      long passed,
      long attention,
      long running) {
  }

  public record ExecutionView(
      String id,
      String ruleId,
      String ruleName,
      String dataSourceName,
      String objectName,
      RuleType ruleType,
      TriggerType triggerType,
      ExecutionStatus executionStatus,
      CheckResult checkResult,
      String metricValue,
      String expectedValue,
      LocalDateTime queuedAt,
      LocalDateTime startedAt,
      LocalDateTime finishedAt,
      Long duration,
      String operator,
      String sql,
      String errorMessage) {
  }

  public record ExecutionPageView(
      List<ExecutionView> records,
      long total,
      int current,
      int pageSize,
      ExecutionSummary summary) {
  }
}
