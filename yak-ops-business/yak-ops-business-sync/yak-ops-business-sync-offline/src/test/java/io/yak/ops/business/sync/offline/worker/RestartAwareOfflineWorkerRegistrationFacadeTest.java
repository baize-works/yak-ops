package io.yak.ops.business.sync.offline.worker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.yak.ops.business.sync.offline.engine.LinkUpWorkerProbeClient;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository.NodeRecord;
import io.yak.ops.business.sync.offline.repository.OfflineWorkerRegistrationRepository;
import io.yak.ops.business.sync.offline.repository.OfflineWorkerRestartTakeoverRepository;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerRegistrationModels.LeaseResponse;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerRegistrationModels.RegisterRequest;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class RestartAwareOfflineWorkerRegistrationFacadeTest {

  @Test
  void replacesActiveLeaseForNewerInstanceOnSameNodeAndAddress() {
    OfflineWorkerRegistrationService registration = mock(OfflineWorkerRegistrationService.class);
    OfflineNodeRepository nodes = mock(OfflineNodeRepository.class);
    OfflineWorkerRegistrationRepository events = mock(OfflineWorkerRegistrationRepository.class);
    OfflineWorkerRestartTakeoverRepository takeover =
        mock(OfflineWorkerRestartTakeoverRepository.class);
    OfflineWorkerRestartRecoveryService recovery = mock(OfflineWorkerRestartRecoveryService.class);
    LinkUpWorkerProbeClient probe = mock(LinkUpWorkerProbeClient.class);

    RegisterRequest request = request("instance-new", "http://worker-a:18080", 2_000L);
    LeaseResponse expected = LeaseResponse.builder()
        .nodeId("worker-a")
        .instanceId("instance-new")
        .leaseId("lease-new")
        .build();
    when(registration.register(request, "10.0.0.2"))
        .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "旧租约仍有效"))
        .thenReturn(expected);
    when(probe.normalizeBaseUrl("http://worker-a:18080"))
        .thenReturn("http://worker-a:18080");
    when(nodes.find("worker-a")).thenReturn(activeNode("instance-old", 1_000L));
    when(takeover.fenceActiveLease(
        eq("worker-a"),
        eq("lease-old"),
        eq("instance-old"),
        eq("http://worker-a:18080"),
        eq(2_000L),
        any(LocalDateTime.class),
        anyString()))
        .thenReturn(true);

    RestartAwareOfflineWorkerRegistrationFacade facade = new RestartAwareOfflineWorkerRegistrationFacade(
        registration, nodes, events, takeover, recovery, probe);

    LeaseResponse actual = facade.register(request, "10.0.0.2");

    assertThat(actual).isSameAs(expected);
    verify(registration, times(2)).register(request, "10.0.0.2");
    verify(events).recordEvent(
        eq("worker-a"),
        eq("instance-old"),
        eq("lease-old"),
        eq("RESTART_FENCED"),
        eq("10.0.0.2"),
        anyString());
    verify(recovery).recover("worker-a", "instance-old", "instance-new");
  }

  @Test
  void keepsConflictWhenAddressChanges() {
    OfflineWorkerRegistrationService registration = mock(OfflineWorkerRegistrationService.class);
    OfflineNodeRepository nodes = mock(OfflineNodeRepository.class);
    OfflineWorkerRegistrationRepository events = mock(OfflineWorkerRegistrationRepository.class);
    OfflineWorkerRestartTakeoverRepository takeover =
        mock(OfflineWorkerRestartTakeoverRepository.class);
    OfflineWorkerRestartRecoveryService recovery = mock(OfflineWorkerRestartRecoveryService.class);
    LinkUpWorkerProbeClient probe = mock(LinkUpWorkerProbeClient.class);

    RegisterRequest request = request("instance-new", "http://worker-b:18080", 2_000L);
    ResponseStatusException conflict =
        new ResponseStatusException(HttpStatus.CONFLICT, "旧租约仍有效");
    when(registration.register(request, "10.0.0.2")).thenThrow(conflict);
    when(probe.normalizeBaseUrl("http://worker-b:18080"))
        .thenReturn("http://worker-b:18080");
    when(nodes.find("worker-a")).thenReturn(activeNode("instance-old", 1_000L));

    RestartAwareOfflineWorkerRegistrationFacade facade = new RestartAwareOfflineWorkerRegistrationFacade(
        registration, nodes, events, takeover, recovery, probe);

    assertThatThrownBy(() -> facade.register(request, "10.0.0.2"))
        .isSameAs(conflict);
    verify(takeover, never()).fenceActiveLease(
        anyString(), anyString(), anyString(), anyString(), anyLong(), any(), anyString());
    verify(recovery, never()).recover(anyString(), anyString(), anyString());
  }

  private RegisterRequest request(String instanceId, String baseUrl, long startedAtMillis) {
    RegisterRequest request = new RegisterRequest();
    request.setProtocolVersion(OfflineWorkerRegistrationModels.PROTOCOL_VERSION);
    request.setNodeId("worker-a");
    request.setNodeName("Worker A");
    request.setInstanceId(instanceId);
    request.setBaseUrl(baseUrl);
    request.setEngineVersion("1.0.0");
    request.setStartedAtMillis(startedAtMillis);
    request.setOfflineOnly(true);
    return request;
  }

  private NodeRecord activeNode(String instanceId, long startedAtMillis) {
    return NodeRecord.builder()
        .nodeId("worker-a")
        .nodeName("Worker A")
        .baseUrl("http://worker-a:18080")
        .registrationMode("DYNAMIC")
        .registrationLeaseId("lease-old")
        .registrationInstanceId(instanceId)
        .leaseExpiresAt(LocalDateTime.now().plusMinutes(1))
        .workerInstanceId(instanceId)
        .startedAtMillis(startedAtMillis)
        .build();
  }
}
