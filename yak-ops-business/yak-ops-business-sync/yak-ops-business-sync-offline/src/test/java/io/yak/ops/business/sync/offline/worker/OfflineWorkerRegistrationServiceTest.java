package io.yak.ops.business.sync.offline.worker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.sync.offline.config.OfflineWorkerRegistrationProperties;
import io.yak.ops.business.sync.offline.engine.LinkUpWorkerProbeClient;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository.NodeRecord;
import io.yak.ops.business.sync.offline.repository.OfflineWorkerRegistrationRepository;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerRegistrationModels.HeartbeatRequest;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerRegistrationModels.LeaseResponse;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerRegistrationModels.RegisterRequest;
import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class OfflineWorkerRegistrationServiceTest {

  @Test
  void createsDynamicLeaseAndKeepsWorkerRuntimeFacts() {
    OfflineNodeRepository nodes = mock(OfflineNodeRepository.class);
    OfflineWorkerRegistrationRepository registrations =
        mock(OfflineWorkerRegistrationRepository.class);
    LinkUpWorkerProbeClient probe = mock(LinkUpWorkerProbeClient.class);
    when(probe.normalizeBaseUrl("http://worker-a:18080"))
        .thenReturn("http://worker-a:18080");

    AtomicReference<NodeRecord> stored = new AtomicReference<>();
    doAnswer(invocation -> {
      stored.set(invocation.getArgument(0));
      return null;
    }).when(nodes).upsert(any(NodeRecord.class));
    when(nodes.find("worker-a")).thenAnswer(invocation -> stored.get());

    OfflineWorkerRegistrationService service = service(nodes, registrations, probe);
    LeaseResponse response = service.register(registerRequest("instance-a"), "10.0.0.1");

    assertThat(stored.get().getRegistrationMode()).isEqualTo("DYNAMIC");
    assertThat(stored.get().getRegistrationInstanceId()).isEqualTo("instance-a");
    assertThat(stored.get().getStatus()).isEqualTo("UP");
    assertThat(stored.get().getLeaseExpiresAt()).isAfter(LocalDateTime.now());
    assertThat(response.getLeaseId()).isNotBlank();
    assertThat(response.getHeartbeatSequence()).isZero();
    assertThat(response.getSchedulingStatus()).isEqualTo("ENABLED");
  }

  @Test
  void rejectsDifferentInstanceWhileLeaseIsActive() {
    OfflineNodeRepository nodes = mock(OfflineNodeRepository.class);
    OfflineWorkerRegistrationRepository registrations =
        mock(OfflineWorkerRegistrationRepository.class);
    LinkUpWorkerProbeClient probe = mock(LinkUpWorkerProbeClient.class);
    when(probe.normalizeBaseUrl("http://worker-a:18080"))
        .thenReturn("http://worker-a:18080");
    when(nodes.findForUpdate("worker-a")).thenReturn(activeNode("instance-old", 3L));

    OfflineWorkerRegistrationService service = service(nodes, registrations, probe);

    assertThatThrownBy(() -> service.register(registerRequest("instance-new"), "10.0.0.2"))
        .isInstanceOfSatisfying(ResponseStatusException.class, exception ->
            assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.CONFLICT))
        .hasMessageContaining("旧 Worker 实例租约仍有效");
  }

  @Test
  void rejectsHeartbeatSequenceThatDoesNotIncrease() {
    OfflineNodeRepository nodes = mock(OfflineNodeRepository.class);
    OfflineWorkerRegistrationRepository registrations =
        mock(OfflineWorkerRegistrationRepository.class);
    LinkUpWorkerProbeClient probe = mock(LinkUpWorkerProbeClient.class);
    when(nodes.findForUpdate("worker-a")).thenReturn(activeNode("instance-a", 5L));

    OfflineWorkerRegistrationService service = service(nodes, registrations, probe);
    HeartbeatRequest request = new HeartbeatRequest();
    request.setProtocolVersion(OfflineWorkerRegistrationModels.PROTOCOL_VERSION);
    request.setLeaseId("lease-a");
    request.setNodeId("worker-a");
    request.setInstanceId("instance-a");
    request.setSequence(5L);
    request.setBaseUrl("http://worker-a:18080");
    request.setOfflineOnly(true);

    assertThatThrownBy(() -> service.heartbeat(request, "10.0.0.1"))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("严格递增");
  }

  private OfflineWorkerRegistrationService service(
      OfflineNodeRepository nodes,
      OfflineWorkerRegistrationRepository registrations,
      LinkUpWorkerProbeClient probe) {
    OfflineWorkerRegistrationProperties properties =
        new OfflineWorkerRegistrationProperties();
    properties.setEnabled(true);
    properties.setAutoEnable(true);
    return new OfflineWorkerRegistrationService(
        nodes,
        registrations,
        probe,
        properties,
        new ObjectMapper().findAndRegisterModules());
  }

  private RegisterRequest registerRequest(String instanceId) {
    RegisterRequest request = new RegisterRequest();
    request.setProtocolVersion(OfflineWorkerRegistrationModels.PROTOCOL_VERSION);
    request.setNodeId("worker-a");
    request.setNodeName("Worker A");
    request.setInstanceId(instanceId);
    request.setBaseUrl("http://worker-a:18080");
    request.setEngineVersion("1.0.0");
    request.setStartedAtMillis(System.currentTimeMillis());
    request.setOfflineOnly(true);
    request.setMaxConcurrentJobs(4);
    request.setMaxQueuedJobs(8);
    request.setRunningJobs(1);
    request.setQueuedJobs(0);
    return request;
  }

  private NodeRecord activeNode(String instanceId, long sequence) {
    return NodeRecord.builder()
        .nodeId("worker-a")
        .nodeName("Worker A")
        .baseUrl("http://worker-a:18080")
        .registrationMode("DYNAMIC")
        .registrationLeaseId("lease-a")
        .registrationInstanceId(instanceId)
        .registrationProtocolVersion(OfflineWorkerRegistrationModels.PROTOCOL_VERSION)
        .leaseExpiresAt(LocalDateTime.now().plusMinutes(1))
        .heartbeatSequence(sequence)
        .enabled(true)
        .schedulingStatus("ENABLED")
        .weight(100)
        .labelsJson("{}")
        .workerInstanceId(instanceId)
        .offlineOnly(true)
        .status("UP")
        .maxConcurrentJobs(4)
        .maxQueuedJobs(8)
        .runningJobs(0)
        .queuedJobs(0)
        .createTime(LocalDateTime.now())
        .updateTime(LocalDateTime.now())
        .build();
  }
}
