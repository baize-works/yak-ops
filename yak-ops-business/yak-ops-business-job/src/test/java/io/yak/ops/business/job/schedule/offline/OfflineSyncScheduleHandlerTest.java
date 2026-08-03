package io.yak.ops.business.job.schedule.offline;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.yak.framework.schedule.api.ScheduleExecutionContext;
import io.yak.framework.schedule.api.ScheduleExecutionResult;
import io.yak.ops.business.sync.offline.service.OfflineJobExecutionService;
import io.yak.ops.common.bean.vo.sync.offline.OfflineJobExecutionVO;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;

class OfflineSyncScheduleHandlerTest {

  @Test
  void createsScheduledOfflineExecution() {
    OfflineJobExecutionService executionService =
        mock(OfflineJobExecutionService.class);
    OfflineJobExecutionVO execution =
        OfflineJobExecutionVO.builder().id(1001L).build();
    when(executionService.executeScheduled(42L)).thenReturn(execution);

    OfflineSyncScheduleHandler handler =
        new OfflineSyncScheduleHandler(executionService);
    ScheduleExecutionContext context =
        new ScheduleExecutionContext(
            "trigger-1",
            OfflineSyncScheduleConstants.key(42L),
            "quartz",
            OfflineSyncScheduleConstants.HANDLER_NAME,
            Map.of(OfflineSyncScheduleConstants.PAYLOAD_DEFINITION_ID, "42"),
            Instant.parse("2026-08-03T02:00:00Z"),
            Instant.parse("2026-08-03T02:00:01Z"),
            false,
            1);

    ScheduleExecutionResult result = handler.execute(context);

    verify(executionService).executeScheduled(42L);
    assertThat(result.accepted()).isTrue();
    assertThat(result.businessExecutionId()).isEqualTo("1001");
  }
}
