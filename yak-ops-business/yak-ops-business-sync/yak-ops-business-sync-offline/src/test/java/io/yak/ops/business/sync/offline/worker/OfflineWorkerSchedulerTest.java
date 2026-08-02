package io.yak.ops.business.sync.offline.worker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.sync.offline.config.OfflineSyncProperties;
import io.yak.ops.business.sync.offline.repository.OfflineExecutionControlRepository;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository.NodeRecord;
import io.yak.ops.business.sync.offline.service.OfflineWorkerRegistry;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerScheduler.Assignment;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobDefinitionPO;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class OfflineWorkerSchedulerTest {

  @Test
  void autoModeFiltersLabelsAndChoosesWorkerWithMoreHeadroom() {
    OfflineNodeRepository repository = mock(OfflineNodeRepository.class);
    OfflineExecutionControlRepository executionRepository = executionRepository();
    OfflineWorkerRegistry registry = mock(OfflineWorkerRegistry.class);
    OfflineWorkerScheduler scheduler = scheduler(repository, executionRepository, registry);

    NodeRecord busy = worker(
        "worker-busy", "{\"region\":\"south\"}", 8, 10, 2, 10, 900);
    NodeRecord idle = worker(
        "worker-idle", "{\"region\":\"south\"}", 1, 10, 0, 10, 100);
    NodeRecord otherRegion = worker(
        "worker-north", "{\"region\":\"north\"}", 0, 10, 0, 10, 1000);
    when(repository.listAllForScheduling()).thenReturn(List.of(busy, idle, otherRegion));

    OfflineJobDefinitionPO definition = definition("AUTO", null, "{\"region\":\"south\"}");
    Assignment assignment = scheduler.select(definition);

    assertThat(assignment.getNode().getNodeId()).isEqualTo("worker-idle");
    assertThat(assignment.getMode()).isEqualTo("AUTO");
    assertThat(assignment.getReason()).contains("即时并发余量");
    assertThat(assignment.getCandidatesJson())
        .contains("worker-idle")
        .contains("worker-busy")
        .contains("缺少标签 region=south")
        .contains("\"selected\":true");
  }

  @Test
  void controlPlaneOccupancyPreventsHeartbeatLagOverbooking() {
    OfflineNodeRepository repository = mock(OfflineNodeRepository.class);
    OfflineExecutionControlRepository executionRepository =
        mock(OfflineExecutionControlRepository.class);
    OfflineWorkerRegistry registry = mock(OfflineWorkerRegistry.class);
    OfflineWorkerScheduler scheduler = scheduler(repository, executionRepository, registry);

    NodeRecord first = worker("worker-a", "{}", 0, 4, 0, 4, 100);
    NodeRecord second = worker("worker-b", "{}", 0, 4, 0, 4, 100);
    when(repository.listAllForScheduling()).thenReturn(List.of(first, second));
    when(executionRepository.countActiveExecutionsByNode())
        .thenReturn(Map.of("worker-a", 4));

    Assignment assignment = scheduler.select(definition("AUTO", null, "{}"));

    assertThat(assignment.getNode().getNodeId()).isEqualTo("worker-b");
    assertThat(assignment.getCandidatesJson())
        .contains("\"controlPlaneActive\":4")
        .contains("\"nodeId\":\"worker-a\"");
  }

  @Test
  void manualModeNeverFallsBackToAnotherWorker() {
    OfflineNodeRepository repository = mock(OfflineNodeRepository.class);
    OfflineExecutionControlRepository executionRepository = executionRepository();
    OfflineWorkerRegistry registry = mock(OfflineWorkerRegistry.class);
    OfflineWorkerScheduler scheduler = scheduler(repository, executionRepository, registry);

    NodeRecord selected = worker(
        "worker-manual", "{}", 2, 2, 2, 2, 100);
    NodeRecord spare = worker(
        "worker-spare", "{}", 0, 10, 0, 10, 100);
    when(repository.listAllForScheduling()).thenReturn(List.of(selected, spare));

    OfflineJobDefinitionPO definition = definition("MANUAL", "worker-manual", "{}");

    assertThatThrownBy(() -> scheduler.select(definition))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("指定的 Link-Up Worker 当前不可调度")
        .hasMessageContaining("并发和等待队列均已满");
  }

  @Test
  void manualModeMarksSelectedWorkerInAuditSnapshot() {
    OfflineNodeRepository repository = mock(OfflineNodeRepository.class);
    OfflineExecutionControlRepository executionRepository = executionRepository();
    OfflineWorkerRegistry registry = mock(OfflineWorkerRegistry.class);
    OfflineWorkerScheduler scheduler = scheduler(repository, executionRepository, registry);

    NodeRecord selected = worker(
        "worker-manual", "{}", 0, 4, 0, 4, 100);
    NodeRecord spare = worker(
        "worker-spare", "{}", 0, 8, 0, 8, 1000);
    when(repository.listAllForScheduling()).thenReturn(List.of(selected, spare));

    Assignment assignment = scheduler.select(
        definition("MANUAL", "worker-manual", "{}"));

    assertThat(assignment.getNode().getNodeId()).isEqualTo("worker-manual");
    assertThat(assignment.getCandidatesJson())
        .contains("\"nodeId\":\"worker-manual\"")
        .contains("\"selected\":true");
  }

  @Test
  void rejectsStaleWorkerEvenWhenItReportsUp() {
    OfflineNodeRepository repository = mock(OfflineNodeRepository.class);
    OfflineExecutionControlRepository executionRepository = executionRepository();
    OfflineWorkerRegistry registry = mock(OfflineWorkerRegistry.class);
    OfflineWorkerScheduler scheduler = scheduler(repository, executionRepository, registry);

    NodeRecord stale = worker("worker-stale", "{}", 0, 4, 0, 4, 100);
    stale.setLastHeartbeatTime(LocalDateTime.now().minusMinutes(10));
    when(repository.listAllForScheduling()).thenReturn(List.of(stale));

    assertThatThrownBy(() -> scheduler.select(definition("AUTO", null, "{}")))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("节点心跳已过期");
  }

  @Test
  void invalidDefaultConfigurationDoesNotBlockManualWorkers() {
    OfflineNodeRepository repository = mock(OfflineNodeRepository.class);
    OfflineExecutionControlRepository executionRepository = executionRepository();
    OfflineWorkerRegistry registry = mock(OfflineWorkerRegistry.class);
    OfflineWorkerScheduler scheduler = scheduler(repository, executionRepository, registry);

    NodeRecord manual = worker("worker-manual", "{}", 0, 4, 0, 4, 100);
    when(registry.ensureConfiguredWorker())
        .thenThrow(new IllegalArgumentException("bad default worker url"));
    when(repository.listAllForScheduling()).thenReturn(List.of(manual));

    Assignment assignment = scheduler.select(definition("AUTO", null, "{}"));

    assertThat(assignment.getNode().getNodeId()).isEqualTo("worker-manual");
  }

  private OfflineExecutionControlRepository executionRepository() {
    OfflineExecutionControlRepository repository =
        mock(OfflineExecutionControlRepository.class);
    when(repository.countActiveExecutionsByNode()).thenReturn(Collections.emptyMap());
    return repository;
  }

  private OfflineWorkerScheduler scheduler(
      OfflineNodeRepository repository,
      OfflineExecutionControlRepository executionRepository,
      OfflineWorkerRegistry registry) {
    OfflineSyncProperties properties = new OfflineSyncProperties();
    properties.getControl().setHeartbeatDelayMillis(10_000L);
    properties.getControl().setLostAfterMillis(120_000L);
    return new OfflineWorkerScheduler(
        repository,
        executionRepository,
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
