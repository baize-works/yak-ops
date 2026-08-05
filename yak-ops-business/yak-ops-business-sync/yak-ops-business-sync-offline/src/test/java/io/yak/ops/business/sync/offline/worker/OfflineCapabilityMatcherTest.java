package io.yak.ops.business.sync.offline.worker;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.sync.offline.config.OfflineCapabilityProperties;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository.NodeRecord;
import io.yak.ops.business.sync.offline.worker.OfflineCapabilityMatcher.MatchResult;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class OfflineCapabilityMatcherTest {

  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @Test
  void acceptsMatchingConnectorRoleFingerprintAndFeatures() {
    OfflineCapabilityProperties properties = new OfflineCapabilityProperties();
    OfflineCapabilityMatcher matcher = new OfflineCapabilityMatcher(properties, objectMapper);

    MatchResult result = matcher.match(
        worker("sha256:source", "sha256:sink", "UPSERT", "AUTO_CREATE_TABLE"),
        requirements("sha256:source", "sha256:sink", "UPSERT"));

    assertThat(result.isMatched()).isTrue();
    assertThat(result.getReason()).contains("jdbc/SOURCE").contains("jdbc/SINK");
    assertThat(result.getAssignedCapabilitiesJson())
        .contains("capabilityDigest")
        .contains("instance-current");
  }

  @Test
  void rejectsMissingExecutionCapability() {
    OfflineCapabilityProperties properties = new OfflineCapabilityProperties();
    OfflineCapabilityMatcher matcher = new OfflineCapabilityMatcher(properties, objectMapper);

    MatchResult result = matcher.match(
        worker("sha256:source", "sha256:sink", "AUTO_CREATE_TABLE"),
        requirements("sha256:source", "sha256:sink", "UPSERT"));

    assertThat(result.isMatched()).isFalse();
    assertThat(result.getReason()).contains("缺少能力 UPSERT");
  }

  @Test
  void rejectsSchemaFingerprintMismatchInStrictMode() {
    OfflineCapabilityProperties properties = new OfflineCapabilityProperties();
    properties.setStrictSchemaFingerprint(true);
    OfflineCapabilityMatcher matcher = new OfflineCapabilityMatcher(properties, objectMapper);

    MatchResult result = matcher.match(
        worker("sha256:other", "sha256:sink", "UPSERT"),
        requirements("sha256:source", "sha256:sink", "UPSERT"));

    assertThat(result.isMatched()).isFalse();
    assertThat(result.getReason()).contains("Schema 指纹不一致");
  }

  @Test
  void rejectsStaleCapabilitySnapshot() {
    OfflineCapabilityProperties properties = new OfflineCapabilityProperties();
    properties.setMaxStaleMillis(1_000L);
    OfflineCapabilityMatcher matcher = new OfflineCapabilityMatcher(properties, objectMapper);
    NodeRecord worker = worker("sha256:source", "sha256:sink", "UPSERT");
    worker.setCapabilitySyncedAt(LocalDateTime.now().minusMinutes(1));

    MatchResult result = matcher.match(
        worker,
        requirements("sha256:source", "sha256:sink", "UPSERT"));

    assertThat(result.isMatched()).isFalse();
    assertThat(result.getReason()).contains("能力快照已过期");
  }

  @Test
  void rejectsSnapshotFromPreviousWorkerProcess() {
    OfflineCapabilityProperties properties = new OfflineCapabilityProperties();
    OfflineCapabilityMatcher matcher = new OfflineCapabilityMatcher(properties, objectMapper);
    NodeRecord worker = worker("sha256:source", "sha256:sink", "UPSERT");
    worker.setConnectorSchemasJson(
        worker.getConnectorSchemasJson().replace("instance-current", "instance-old"));

    MatchResult result = matcher.match(
        worker,
        requirements("sha256:source", "sha256:sink", "UPSERT"));

    assertThat(result.isMatched()).isFalse();
    assertThat(result.getReason()).contains("旧 Worker 进程");
  }

  @Test
  void disabledCapabilitySchedulingKeepsWorkerEligible() {
    OfflineCapabilityProperties properties = new OfflineCapabilityProperties();
    properties.setEnabled(false);
    OfflineCapabilityMatcher matcher = new OfflineCapabilityMatcher(properties, objectMapper);
    NodeRecord worker = NodeRecord.builder().nodeId("worker-1").build();

    MatchResult result = matcher.match(
        worker,
        requirements("sha256:source", "sha256:sink", "UPSERT"));

    assertThat(result.isMatched()).isTrue();
    assertThat(result.getReason()).contains("已关闭");
  }

  private NodeRecord worker(
      String sourceFingerprint,
      String sinkFingerprint,
      String... sinkCapabilities) {
    StringBuilder capabilities = new StringBuilder();
    for (int index = 0; index < sinkCapabilities.length; index++) {
      if (index > 0) {
        capabilities.append(',');
      }
      capabilities.append('"').append(sinkCapabilities[index]).append('"');
    }
    String snapshot = "{\"workerInstanceId\":\"instance-current\","
        + "\"engineVersion\":\"1.0.0\",\"connectors\":["
        + "{\"connectorId\":\"jdbc\",\"role\":\"SOURCE\","
        + "\"schemaVersion\":\"1\",\"schemaFingerprint\":\""
        + sourceFingerprint + "\",\"capabilities\":[\"MULTI_TABLE\",\"CUSTOM_SQL\"]},"
        + "{\"connectorId\":\"jdbc\",\"role\":\"SINK\","
        + "\"schemaVersion\":\"1\",\"schemaFingerprint\":\""
        + sinkFingerprint + "\",\"capabilities\":[" + capabilities + "]}]}";
    return NodeRecord.builder()
        .nodeId("worker-1")
        .workerInstanceId("instance-current")
        .engineVersion("1.0.0")
        .capabilityStatus("READY")
        .capabilityDigest("sha256:worker")
        .connectorSchemasJson(snapshot)
        .capabilitySyncedAt(LocalDateTime.now())
        .build();
  }

  private String requirements(
      String sourceFingerprint,
      String sinkFingerprint,
      String sinkCapability) {
    return "{\"version\":\"1\",\"endpoints\":["
        + "{\"connectorId\":\"jdbc\",\"role\":\"SOURCE\","
        + "\"schemaFingerprint\":\"" + sourceFingerprint + "\","
        + "\"capabilities\":[\"MULTI_TABLE\"]},"
        + "{\"connectorId\":\"jdbc\",\"role\":\"SINK\","
        + "\"schemaFingerprint\":\"" + sinkFingerprint + "\","
        + "\"capabilities\":[\"" + sinkCapability + "\"]}]}";
  }
}
