package io.yak.ops.business.job.schedule.quality;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.yak.framework.schedule.api.ScheduleExecutionContext;
import io.yak.framework.schedule.api.ScheduleExecutionResult;
import io.yak.ops.business.quality.api.QualityExecutionApi.CheckResult;
import io.yak.ops.business.quality.api.QualityExecutionApi.ExecutionStatus;
import io.yak.ops.business.quality.api.QualityExecutionApi.ExecutionView;
import io.yak.ops.business.quality.api.QualityExecutionApi.TriggerType;
import io.yak.ops.business.quality.api.QualityRuleApi.RuleType;
import io.yak.ops.business.quality.service.QualityExecutionService;
import io.yak.ops.business.quality.service.QualityExecutionService.ScheduledSubmission;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Map;
import org.junit.jupiter.api.Test;

class QualityRuleScheduleHandlerTest {

  @Test
  void createsScheduledQualityExecution() {
    QualityExecutionService service = mock(QualityExecutionService.class);
    ExecutionView execution = new ExecutionView(
        "QE-1001",
        "42",
        "用户表行数",
        "业务库",
        "yak_ops.user_info",
        RuleType.TABLE_ROW_COUNT,
        TriggerType.SCHEDULE,
        ExecutionStatus.WAITING,
        CheckResult.UNKNOWN,
        null,
        "> 0 行",
        LocalDateTime.of(2026, 8, 4, 23, 0),
        null,
        null,
        null,
        "yak-schedule",
        null,
        null);
    when(service.runScheduled(42L))
        .thenReturn(new ScheduledSubmission(
            execution,
            true,
            "数据质量检查已提交"));

    QualityRuleScheduleHandler handler =
        new QualityRuleScheduleHandler(service);
    ScheduleExecutionContext context = context(42L);

    ScheduleExecutionResult result = handler.execute(context);

    verify(service).runScheduled(42L);
    assertThat(result.accepted()).isTrue();
    assertThat(result.businessExecutionId()).isEqualTo("QE-1001");
  }

  @Test
  void acceptsSkippedTriggerWithoutCreatingDuplicateExecution() {
    QualityExecutionService service = mock(QualityExecutionService.class);
    when(service.runScheduled(42L))
        .thenReturn(new ScheduledSubmission(
            null,
            false,
            "上一轮质量检查仍在运行，本次调度已跳过"));

    ScheduleExecutionResult result =
        new QualityRuleScheduleHandler(service).execute(context(42L));

    assertThat(result.accepted()).isTrue();
    assertThat(result.businessExecutionId()).isNull();
  }

  private static ScheduleExecutionContext context(long ruleId) {
    return new ScheduleExecutionContext(
        "trigger-1",
        QualityScheduleConstants.key(ruleId),
        "quartz",
        QualityScheduleConstants.HANDLER_NAME,
        Map.of(
            QualityScheduleConstants.PAYLOAD_RULE_ID,
            String.valueOf(ruleId)),
        Instant.parse("2026-08-04T15:00:00Z"),
        Instant.parse("2026-08-04T15:00:01Z"),
        false,
        1);
  }
}
