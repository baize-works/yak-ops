package io.yak.ops.business.quality.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import io.yak.ops.business.quality.api.QualityRuleApi.Importance;
import io.yak.ops.business.quality.api.QualityRuleApi.RuleResult;
import io.yak.ops.business.quality.api.QualityRuleApi.RuleScope;
import io.yak.ops.business.quality.api.QualityRuleApi.RuleType;
import io.yak.ops.business.quality.api.QualityRuleApi.RuleView;
import io.yak.ops.business.quality.api.QualityRuleApi.ScheduleMode;
import io.yak.ops.business.quality.execution.QualityExecutionGateway;
import io.yak.ops.business.quality.execution.QualityMetricEvaluator;
import io.yak.ops.business.quality.repository.QualityExecutionRepository;
import io.yak.ops.business.quality.repository.QualityRuleRepository;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class QualityExecutionScheduleTest {

  @Test
  void skipsScheduledTriggerWhenPreviousExecutionIsStillActive() {
    QualityRuleRepository ruleRepository = mock(QualityRuleRepository.class);
    QualityExecutionRepository executionRepository =
        mock(QualityExecutionRepository.class);
    QualityExecutionGateway gateway = mock(QualityExecutionGateway.class);
    QualityExecutionService service = new QualityExecutionService(
        ruleRepository,
        executionRepository,
        new QualityMetricEvaluator(),
        gateway);

    when(ruleRepository.findByIdForUpdate(42L))
        .thenReturn(Optional.of(scheduleRule(true)));
    when(executionRepository.hasActiveExecution(42L)).thenReturn(true);

    QualityExecutionService.ScheduledSubmission submission =
        service.runScheduled(42L);

    assertThat(submission.submitted()).isFalse();
    assertThat(submission.message()).contains("上一轮");
    verifyNoInteractions(gateway);
  }

  @Test
  void skipsScheduledTriggerAfterRuleIsDisabled() {
    QualityRuleRepository ruleRepository = mock(QualityRuleRepository.class);
    QualityExecutionRepository executionRepository =
        mock(QualityExecutionRepository.class);
    QualityExecutionGateway gateway = mock(QualityExecutionGateway.class);
    QualityExecutionService service = new QualityExecutionService(
        ruleRepository,
        executionRepository,
        new QualityMetricEvaluator(),
        gateway);

    when(ruleRepository.findByIdForUpdate(42L))
        .thenReturn(Optional.of(scheduleRule(false)));

    QualityExecutionService.ScheduledSubmission submission =
        service.runScheduled(42L);

    assertThat(submission.submitted()).isFalse();
    assertThat(submission.message()).contains("停用");
    verifyNoInteractions(executionRepository, gateway);
  }

  private static RuleView scheduleRule(boolean enabled) {
    return new RuleView(
        "42",
        "用户表行数",
        null,
        "1",
        "业务库",
        "yak_ops",
        null,
        "yak_ops",
        "user_info",
        null,
        RuleScope.TABLE,
        RuleType.TABLE_ROW_COUNT,
        "完整性",
        ">",
        BigDecimal.ZERO,
        null,
        "行",
        ScheduleMode.SCHEDULE,
        "DAILY_0200",
        "每天 02:00",
        "0 0 2 * * ?",
        enabled,
        Importance.NORMAL,
        RuleResult.NOT_RUN,
        null,
        null,
        null,
        "tester",
        null,
        null,
        null);
  }
}
