package io.yak.ops.business.job.schedule.quality;

import io.yak.framework.schedule.api.ScheduleExecutionContext;
import io.yak.framework.schedule.api.ScheduleExecutionResult;
import io.yak.framework.schedule.api.ScheduleHandler;
import io.yak.ops.business.quality.config.ConditionalOnQualityEnabled;
import io.yak.ops.business.quality.service.QualityExecutionService;
import io.yak.ops.business.quality.service.QualityExecutionService.ScheduledSubmission;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component(QualityScheduleConstants.HANDLER_NAME)
@ConditionalOnQualityEnabled
@ConditionalOnProperty(
    prefix = "yak.job.schedule",
    name = "enabled",
    havingValue = "true",
    matchIfMissing = true)
public class QualityRuleScheduleHandler implements ScheduleHandler {

  private final QualityExecutionService executionService;

  public QualityRuleScheduleHandler(QualityExecutionService executionService) {
    this.executionService = executionService;
  }

  @Override
  public ScheduleExecutionResult execute(ScheduleExecutionContext context) {
    Long ruleId = context.requiredLong(QualityScheduleConstants.PAYLOAD_RULE_ID);
    ScheduledSubmission submission = executionService.runScheduled(ruleId);
    if (!submission.submitted()) {
      return ScheduleExecutionResult.accepted(null, submission.message());
    }
    return ScheduleExecutionResult.accepted(
        submission.execution().id(),
        submission.message());
  }
}
