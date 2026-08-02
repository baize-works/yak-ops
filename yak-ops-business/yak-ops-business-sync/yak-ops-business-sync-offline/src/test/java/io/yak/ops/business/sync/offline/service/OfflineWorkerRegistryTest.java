package io.yak.ops.business.sync.offline.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.yak.ops.business.sync.offline.config.OfflineSyncProperties;
import io.yak.ops.business.sync.offline.engine.LinkUpWorkerProbeClient;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository.NodeRecord;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class OfflineWorkerRegistryTest {

  @Test
  void registersConfiguredWorkerWithInitialManagedDefaults() {
    LinkUpWorkerProbeClient probeClient = mock(LinkUpWorkerProbeClient.class);
    OfflineNodeRepository repository = mock(OfflineNodeRepository.class);
    OfflineSyncProperties properties = properties();
    NodeRecord persisted = NodeRecord.builder()
        .nodeId("link-up-node-1")
        .nodeName("Link-Up Offline Worker")
        .baseUrl("http://127.0.0.1:18080")
        .registrationMode("CONFIG")
        .enabled(true)
        .schedulingStatus("ENABLED")
        .weight(100)
        .status("DOWN")
        .build();

    when(probeClient.normalizeBaseUrl("http://127.0.0.1:18080"))
        .thenReturn("http://127.0.0.1:18080");
    when(repository.find("link-up-node-1")).thenReturn(null, persisted);

    OfflineWorkerRegistry registry =
        new OfflineWorkerRegistry(probeClient, repository, properties);
    NodeRecord result = registry.ensureConfiguredWorker();

    ArgumentCaptor<NodeRecord> captor = ArgumentCaptor.forClass(NodeRecord.class);
    verify(repository).upsert(captor.capture());
    assertThat(captor.getValue().getRegistrationMode()).isEqualTo("CONFIG");
    assertThat(captor.getValue().getEnabled()).isTrue();
    assertThat(captor.getValue().getSchedulingStatus()).isEqualTo("ENABLED");
    assertThat(result).isSameAs(persisted);
  }

  @Test
  void preservesDisabledStateOfExistingConfiguredWorker() {
    LinkUpWorkerProbeClient probeClient = mock(LinkUpWorkerProbeClient.class);
    OfflineNodeRepository repository = mock(OfflineNodeRepository.class);
    OfflineSyncProperties properties = properties();
    NodeRecord existing = NodeRecord.builder()
        .nodeId("link-up-node-1")
        .nodeName("Link-Up Offline Worker")
        .baseUrl("http://127.0.0.1:18080")
        .registrationMode("CONFIG")
        .enabled(false)
        .schedulingStatus("DISABLED")
        .build();

    when(probeClient.normalizeBaseUrl("http://127.0.0.1:18080"))
        .thenReturn("http://127.0.0.1:18080");
    when(repository.find("link-up-node-1")).thenReturn(existing);

    OfflineWorkerRegistry registry =
        new OfflineWorkerRegistry(probeClient, repository, properties);

    assertThat(registry.ensureConfiguredWorker()).isSameAs(existing);
    verify(repository, never()).upsert(existing);
  }

  @Test
  void keepsHeartbeatLoopRunningWhenDefaultConfigurationIsInvalid() {
    LinkUpWorkerProbeClient probeClient = mock(LinkUpWorkerProbeClient.class);
    OfflineNodeRepository repository = mock(OfflineNodeRepository.class);
    OfflineSyncProperties properties = properties();
    NodeRecord manual = NodeRecord.builder()
        .nodeId("manual-node")
        .nodeName("Manual Worker")
        .baseUrl("http://10.0.0.8:18080")
        .enabled(true)
        .schedulingStatus("ENABLED")
        .build();

    when(probeClient.normalizeBaseUrl(properties.getEngine().getBaseUrl()))
        .thenThrow(new IllegalArgumentException("bad default url"));
    when(repository.listHeartbeatTargets()).thenReturn(List.of(manual));
    when(probeClient.node(manual.getBaseUrl()))
        .thenThrow(new IllegalStateException("manual worker down"));

    OfflineWorkerRegistry registry =
        new OfflineWorkerRegistry(probeClient, repository, properties);
    registry.refreshAll();

    verify(repository).updateHeartbeatFailure("manual-node", "manual worker down");
  }

  private OfflineSyncProperties properties() {
    OfflineSyncProperties properties = new OfflineSyncProperties();
    properties.getEngine().setEnabled(true);
    properties.getEngine().setNodeId("link-up-node-1");
    properties.getEngine().setNodeName("Link-Up Offline Worker");
    properties.getEngine().setBaseUrl("http://127.0.0.1:18080");
    return properties;
  }
}
