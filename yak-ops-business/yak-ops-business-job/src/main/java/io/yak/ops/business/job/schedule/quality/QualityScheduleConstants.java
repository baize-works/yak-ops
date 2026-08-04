package io.yak.ops.business.job.schedule.quality;

import io.yak.framework.schedule.api.ScheduleKey;

public final class QualityScheduleConstants {

  public static final String NAMESPACE = "data-quality";
  public static final String HANDLER_NAME = "qualityRuleScheduleHandler";
  public static final String PAYLOAD_RULE_ID = "ruleId";

  private QualityScheduleConstants() {
  }

  public static ScheduleKey key(Long ruleId) {
    if (ruleId == null || ruleId <= 0L) {
      throw new IllegalArgumentException("ruleId must be positive");
    }
    return new ScheduleKey(NAMESPACE, "rule-" + ruleId);
  }
}
