package io.yak.ops.business.job.schedule.quality;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.yak.framework.schedule.api.ConcurrencyPolicy;
import io.yak.framework.schedule.api.ScheduleDefinition;
import io.yak.framework.schedule.api.ScheduleManager;
import io.yak.framework.schedule.api.ScheduleSnapshot;
import io.yak.framework.schedule.api.ScheduleStatus;
import io.yak.ops.business.job.schedule.JobScheduleProperties;
import io.yak.ops.business.quality.api.QualityScheduleApi.ScheduleRule;
import io.yak.ops.business.quality.service.QualityScheduleService;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class QualityRuleScheduleRegistrarTest {

  @Test
  void registersQualityCronWithNonConcurrentPolicy() {
    ScheduleManager manager = mock(ScheduleManager.class);
    QualityScheduleService service = mock(QualityScheduleService.class);
    JobScheduleProperties properties = new JobScheduleProperties();
    properties.setZoneId("Asia/Shanghai");

    ScheduleRule record =
        new ScheduleRule(42L, "用户表行数", "0 0/5 * * * ?", true);
    when(service.findAllSchedules()).thenReturn(List.of(record));
    when(manager.get(QualityScheduleConstants.key(42L)))
        .thenReturn(Optional.empty());
    when(manager.save(any(ScheduleDefinition.class)))
        .thenAnswer(invocation -> {
          ScheduleDefinition definition = invocation.getArgument(0);
          return new ScheduleSnapshot(
              definition,
              "quartz",
              definition.key().value(),
              ScheduleStatus.ENABLED,
              Instant.parse("2026-08-04T15:00:00Z"),
              null);
        });
    when(manager.list(QualityScheduleConstants.NAMESPACE))
        .thenReturn(List.of());

    new QualityRuleScheduleRegistrar(manager, service, properties)
        .synchronize();

    ArgumentCaptor<ScheduleDefinition> captor =
        ArgumentCaptor.forClass(ScheduleDefinition.class);
    verify(manager).save(captor.capture());

    ScheduleDefinition definition = captor.getValue();
    assertThat(definition.key())
        .isEqualTo(QualityScheduleConstants.key(42L));
    assertThat(definition.trigger().expression())
        .isEqualTo("0 0/5 * * * ?");
    assertThat(definition.trigger().zoneId())
        .isEqualTo(ZoneId.of("Asia/Shanghai"));
    assertThat(definition.target().handler())
        .isEqualTo(QualityScheduleConstants.HANDLER_NAME);
    assertThat(definition.target().payload())
        .containsEntry(QualityScheduleConstants.PAYLOAD_RULE_ID, "42");
    assertThat(definition.policy().concurrencyPolicy())
        .isEqualTo(ConcurrencyPolicy.FORBID);
    assertThat(definition.policy().triggerRetries()).isZero();
    assertThat(definition.enabled()).isTrue();
  }

  @Test
  void removesQuartzSchedulesAfterRuleStopsBeingScheduled() {
    ScheduleManager manager = mock(ScheduleManager.class);
    QualityScheduleService service = mock(QualityScheduleService.class);
    JobScheduleProperties properties = new JobScheduleProperties();

    QualityRuleScheduleRegistrar registrar =
        new QualityRuleScheduleRegistrar(manager, service, properties);
    ScheduleDefinition orphan = registrar.definition(
        new ScheduleRule(99L, "孤立规则", "0 0 2 * * ?", true));

    when(service.findAllSchedules()).thenReturn(List.of());
    when(manager.list(QualityScheduleConstants.NAMESPACE))
        .thenReturn(List.of(
            new ScheduleSnapshot(
                orphan,
                "quartz",
                orphan.key().value(),
                ScheduleStatus.ENABLED,
                null,
                null)));

    registrar.synchronize();

    verify(manager).delete(orphan.key());
  }
}
