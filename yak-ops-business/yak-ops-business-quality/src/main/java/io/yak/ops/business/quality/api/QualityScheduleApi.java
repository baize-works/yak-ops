package io.yak.ops.business.quality.api;

public final class QualityScheduleApi {

  private QualityScheduleApi() {
  }

  public record ScheduleRule(
      Long ruleId,
      String ruleName,
      String cronExpression,
      boolean enabled) {
  }
}
