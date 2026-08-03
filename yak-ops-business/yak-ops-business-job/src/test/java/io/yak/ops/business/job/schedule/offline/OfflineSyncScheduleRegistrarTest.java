package io.yak.ops.business.job.schedule.offline;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.yak.framework.schedule.api.ConcurrencyPolicy;
import io.yak.framework.schedule.api.ScheduleDefinition;
import io.yak.framework.schedule.api.ScheduleManager;
import io.yak.framework.schedule.api.ScheduleSnapshot;
import io.yak.framework.schedule.api.ScheduleStatus;
import io.yak.ops.business.job.schedule.JobScheduleProperties;
import io.yak.ops.business.sync.offline.repository.OfflineScheduleRepository;
import io.yak.ops.business.sync.offline.repository.OfflineScheduleRepository.ScheduleRecord;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class OfflineSyncScheduleRegistrarTest {

  @Test
  void registersOfflineCronWithBusinessRetryKeptOutsideFramework() {
    ScheduleManager manager = mock(ScheduleManager.class);
    OfflineScheduleRepository repository = mock(OfflineScheduleRepository.class);
    JobScheduleProperties properties = new JobScheduleProperties();
    properties.setZoneId("Asia/Shanghai");

    ScheduleRecord record =
        new ScheduleRecord(
            42L,
            "0 0/5 * * * ?",
            true,
            4,
            60,
            null,
            null,
            "{}");
    when(repository.findAllSchedules()).thenReturn(List.of(record));
    when(manager.get(OfflineSyncScheduleConstants.key(42L))).thenReturn(Optional.empty());
    when(manager.save(any(ScheduleDefinition.class)))
        .thenAnswer(invocation -> {
          ScheduleDefinition definition = invocation.getArgument(0);
          return new ScheduleSnapshot(
              definition,
              "quartz",
              definition.key().value(),
              ScheduleStatus.ENABLED,
              Instant.parse("2026-08-03T03:00:00Z"),
              null);
        });
    when(manager.list(OfflineSyncScheduleConstants.NAMESPACE)).thenReturn(List.of());

    new OfflineSyncScheduleRegistrar(manager, repository, properties).synchronize();

    ArgumentCaptor<ScheduleDefinition> captor =
        ArgumentCaptor.forClass(ScheduleDefinition.class);
    verify(manager).save(captor.capture());

    ScheduleDefinition definition = captor.getValue();
    assertThat(definition.key()).isEqualTo(OfflineSyncScheduleConstants.key(42L));
    assertThat(definition.trigger().expression()).isEqualTo("0 0/5 * * * ?");
    assertThat(definition.trigger().zoneId()).isEqualTo(ZoneId.of("Asia/Shanghai"));
    assertThat(definition.target().handler())
        .isEqualTo(OfflineSyncScheduleConstants.HANDLER_NAME);
    assertThat(definition.target().payload())
        .containsEntry(OfflineSyncScheduleConstants.PAYLOAD_DEFINITION_ID, "42");
    assertThat(definition.policy().concurrencyPolicy())
        .isEqualTo(ConcurrencyPolicy.FORBID);
    assertThat(definition.policy().triggerRetries()).isZero();

    verify(repository).updateRuntimeState(
        eq(42L),
        isNull(),
        eq(LocalDateTime.of(2026, 8, 3, 11, 0)));
  }

  @Test
  void removesQuartzSchedulesWithoutPersistentOfflineDefinition() {
    ScheduleManager manager = mock(ScheduleManager.class);
    OfflineScheduleRepository repository = mock(OfflineScheduleRepository.class);
    JobScheduleProperties properties = new JobScheduleProperties();

    ScheduleDefinition orphan =
        new OfflineSyncScheduleRegistrar(manager, repository, properties)
            .definition(
                new ScheduleRecord(
                    99L,
                    "0 0 2 * * ?",
                    true,
                    1,
                    30,
                    null,
                    null,
                    "{}"));

    when(repository.findAllSchedules()).thenReturn(List.of());
    when(manager.list(OfflineSyncScheduleConstants.NAMESPACE))
        .thenReturn(List.of(
            new ScheduleSnapshot(
                orphan,
                "quartz",
                orphan.key().value(),
                ScheduleStatus.ENABLED,
                null,
                null)));

    new OfflineSyncScheduleRegistrar(manager, repository, properties).synchronize();

    verify(manager).delete(orphan.key());
  }
}
