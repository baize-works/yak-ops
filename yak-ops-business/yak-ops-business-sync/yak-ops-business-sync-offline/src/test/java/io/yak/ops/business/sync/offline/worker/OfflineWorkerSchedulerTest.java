package io.yak.ops.business.sync.offline.worker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.sync.offline.config.OfflineSyncProperties;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository.NodeRecord;
import io.yak.ops.business.sync.offline.service.OfflineWorkerRegistry;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerScheduler.Assignment;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobDefinitionPO;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class OfflineWorkerSchedulerTest {

  @Test
  void autoModeFiltersLabelsAndChoosesWorkerWithMoreHeadroom() {
    OfflineNodeRepository repository = mock(OfflineNodeRepository.class);
    OfflineWorkerRegistry registry = mock(OfflineWorkerRegistry.class);
    OfflineWorkerScheduler scheduler = scheduler(repository, registry);

    NodeRecord busy = worker(
        "worker-busy", "{\"region\":\"south\"}", 8, 10, 2, 10, 900);
    NodeRecord idle = worker(
        "worker-idle", "{\"region\":\"south\"}", 1, 10, 0, 10, 100);
    NodeRecord otherRegion = worker(
        "worker-north", "{\"region\":\"north\"}", 0, 10, 0, 10, 1000);
    when(repository.listAll()).thenReturn(List.of(busy, idle, otherRegion));

    OfflineJobDefinitionPO definition = definition("AUTO", null, "{\"region\":\"south\"}");
    Assignment assignment = scheduler.select(definition);

    assertThat(assignment.getNode().getNodeId()).isEqualTo("worker-idle");
    assertThat(assignment.getMode()).isEqualTo("AUTO");
    assertThat(assignment.getReason()).contains("即时并发余量");
    assertThat(assignment.getCandidatesJson())
        .contains("worker-idle")
        .contains("worker-busy")
        .contains("缺少标签 region=south");
  }

  @Test
  void manualModeNeverFallsBackToAnotherWorker() {
    OfflineNodeRepository repository = mock(OfflineNodeRepository.class);
    OfflineWorkerRegistry registry = mock(OfflineWorkerRegistry.class);
    OfflineWorkerScheduler scheduler = scheduler(repository, registry);

    NodeRecord selected = worker(
        "worker-manual", "{}", 2, 2, 2, 2, 100);
    NodeRecord spare = worker(
        "worker-spare", "{}", 0, 10, 0, 10, 100);
    when(repository.listAll()).thenReturn(List.of(selected, spare));

    OfflineJobDefinitionPO definition = definition("MANUAL", "worker-manual", "{}");

    assertThatThrownBy(() -> scheduler.select(definition))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("指定的 Link-Up Worker 当前不可调度")
        .hasMessageContaining("并发和等待队列均已满");
  }

  @Test
  void rejectsStaleWorkerEvenWhenItReportsUp() {
    OfflineNodeRepository repository = mock(OfflineNodeRepository.class);
    OfflineWorkerRegistry registry = mock(OfflineWorkerRegistry.class);
    OfflineWorkerScheduler scheduler = scheduler(repository, registry);

    NodeRecord stale = worker("worker-stale", "{}", 0, 4, 0, 4, 100);
    stale.setLastHeartbeatTime(LocalDateTime.now().minusMinutes(10));
    when(repository.listAll()).thenReturn(List.of(stale));

    assertThatThrownBy(() -> scheduler.select(definition("AUTO", null, "{}")))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("节点心跳已过期");
  }

  private OfflineWorkerScheduler scheduler(
      OfflineNodeRepository repository,
      OfflineWorkerRegistry registry) {
    OfflineSyncProperties properties = new OfflineSyncProperties();
    properties.getControl().setHeartbeatDelayMillis(10_000L);
    properties.getControl().setLostAfterMillis(120_000L);
    return new OfflineWorkerScheduler(
        repository,
        registry,
        properties,
        new ObjectMapper().findAndRegisterModules());
  }

  private OfflineJobDefinitionPO definition(
      String mode,
      String nodeId,
      String labelsJson) {
    OfflineJobDefinitionPO definition = new OfflineJobDefinitionPO();
    definition.setWorkerSelectMode(mode);
    definition.setWorkerNodeId(nodeId);
    definition.setWorkerRequiredLabelsJson(labelsJson);
    return definition;
  }

  private NodeRecord worker(
      String nodeId,
      String labelsJson,
      int running,
      int maxRunning,
      int queued,
      int maxQueued,
      int weight) {
    return NodeRecord.builder()
        .nodeId(nodeId)
        .nodeName(nodeId)
        .baseUrl("http://" + nodeId + ":18080")
        .registrationMode("MANUAL")
        .enabled(true)
        .schedulingStatus("ENABLED")
        .weight(weight)
        .labelsJson(labelsJson)
        .workerInstanceId(nodeId + "-instance")
        .offlineOnly(true)
        .status("UP")
        .maxConcurrentJobs(maxRunning)
        .maxQueuedJobs(maxQueued)
        .runningJobs(running)
        .queuedJobs(queued)
        .lastHeartbeatTime(LocalDateTime.now())
        .build();
  }
}
