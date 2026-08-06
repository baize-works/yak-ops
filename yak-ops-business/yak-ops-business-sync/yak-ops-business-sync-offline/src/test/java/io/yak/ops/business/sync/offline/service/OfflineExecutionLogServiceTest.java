package io.yak.ops.business.sync.offline.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import io.yak.ops.business.sync.offline.engine.LinkUpClient;
import io.yak.ops.business.sync.offline.engine.LinkUpClient.LinkUpJobLogEntry;
import io.yak.ops.business.sync.offline.engine.LinkUpClient.LinkUpJobLogPageResponse;
import io.yak.ops.business.sync.offline.repository.OfflineExecutionControlRepository;
import io.yak.ops.business.sync.offline.repository.OfflineExecutionControlRepository.ExecutionEventRecord;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobExecutionPO;
import io.yak.ops.common.bean.vo.sync.offline.OfflineExecutionLogPageVO;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.Test;

class OfflineExecutionLogServiceTest {

  @Test
  void mergesControlPlaneAndWorkerLogsByTimestamp() {
    OfflineExecutionControlRepository repository =
        mock(OfflineExecutionControlRepository.class);
    LinkUpClient linkUpClient = mock(LinkUpClient.class);
    OfflineExecutionLogService service =
        new OfflineExecutionLogService(repository, linkUpClient);

    OfflineJobExecutionPO execution = new OfflineJobExecutionPO();
    execution.setId(3L);
    execution.setStatus("SUCCEEDED");
    execution.setExternalExecutionId("yak-offline-3");
    execution.setEngineJobId("flux-3");

    LocalDateTime eventTime =
        LocalDateTime.of(2026, 8, 6, 8, 53, 10, 100_000_000);
    ExecutionEventRecord event =
        new ExecutionEventRecord(
            7L,
            3L,
            2L,
            "CREATED",
            "SUBMITTED",
            "SUBMITTING",
            "正在向 Link-Up 提交 JobSpec",
            null,
            eventTime);
    when(repository.listExecutionEventsAfter(3L, 0L, 100))
        .thenReturn(List.of(event));
    when(repository.listExecutionEventsAfter(3L, 0L, 1000))
        .thenReturn(List.of(event));

    LinkUpJobLogEntry linkEntry = new LinkUpJobLogEntry();
    linkEntry.setSequence(12L);
    linkEntry.setTimestampMillis(
        eventTime
                .plusNanos(100_000_000)
                .atZone(ZoneId.systemDefault())
                .toInstant()
                .toEpochMilli());
    linkEntry.setLevel("INFO");
    linkEntry.setThread("link-up-job-1");
    linkEntry.setLogger("c.l.u.f.e.JobExecution");
    linkEntry.setMessage("Job started");

    LinkUpJobLogPageResponse linkPage =
        new LinkUpJobLogPageResponse();
    linkPage.setJobId("flux-3");
    linkPage.setExternalExecutionId("yak-offline-3");
    linkPage.setRunId("orders-1");
    linkPage.setItems(List.of(linkEntry));
    linkPage.setNextCursor(120L);
    linkPage.setCompleted(true);
    when(linkUpClient.logs("flux-3", 0L, 100))
        .thenReturn(linkPage);
    when(linkUpClient.logs("flux-3", 0L, 1000))
        .thenReturn(linkPage);

    OfflineExecutionLogPageVO result =
        service.logs(execution, "0:0", 100);

    assertEquals(2, result.getItems().size());
    assertEquals("YAK_OPS", result.getItems().get(0).getSource());
    assertEquals("LINK_UP", result.getItems().get(1).getSource());
    assertEquals("7:120", result.getNextCursor());
    assertTrue(result.isCompleted());
    assertTrue(result.isLinkUpAvailable());
    assertEquals("orders-1", result.getItems().get(1).getRunId());

    String text = service.text(execution);
    assertTrue(text.contains("2026-08-06 08:53:10.100"));
    assertTrue(text.contains("[YAK_OPS]"));
    assertTrue(text.contains("[LINK_UP]"));
  }
}
