package io.yak.ops.business.sync.offline.worker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.sync.offline.config.OfflineCapabilityProperties;
import io.yak.ops.business.sync.offline.repository.OfflineWorkerPreflightRepository;
import io.yak.ops.business.sync.offline.repository.OfflineWorkerPreflightRepository.PreflightRecord;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class OfflineReachabilityMatcherTest {

  @Test
  void acceptsFreshSourceAndSinkPreflightEvidence() {
    OfflineWorkerPreflightRepository repository = mock(OfflineWorkerPreflightRepository.class);
    OfflineCapabilityProperties properties = new OfflineCapabilityProperties();
    OfflineReachabilityMatcher matcher = new OfflineReachabilityMatcher(
        repository,
        properties,
        new ObjectMapper().findAndRegisterModules());
    when(repository.find("worker-1", "jdbc", "SOURCE", "sha256:source"))
        .thenReturn(record("SOURCE", "sha256:source", "REACHABLE"));
    when(repository.find("worker-1", "jdbc", "SINK", "sha256:sink"))
        .thenReturn(record("SINK", "sha256:sink", "REACHABLE"));

    OfflineReachabilityMatcher.MatchResult result = matcher.match(
        "worker-1",
        requirements());

    assertThat(result.isMatched()).isTrue();
    assertThat(result.getReason()).contains("jdbc/SOURCE=REACHABLE");
    assertThat(result.getAssignedReachabilityJson())
        .contains("sha256:source")
        .contains("sha256:sink");
  }

  @Test
  void rejectsUnreachableSinkInStrictMode() {
    OfflineWorkerPreflightRepository repository = mock(OfflineWorkerPreflightRepository.class);
    OfflineCapabilityProperties properties = new OfflineCapabilityProperties();
    OfflineReachabilityMatcher matcher = new OfflineReachabilityMatcher(
        repository,
        properties,
        new ObjectMapper().findAndRegisterModules());
    when(repository.find("worker-1", "jdbc", "SOURCE", "sha256:source"))
        .thenReturn(record("SOURCE", "sha256:source", "REACHABLE"));
    PreflightRecord sink = record("SINK", "sha256:sink", "UNREACHABLE");
    sink.setErrorMessage("connection refused");
    when(repository.find("worker-1", "jdbc", "SINK", "sha256:sink"))
        .thenReturn(sink);

    OfflineReachabilityMatcher.MatchResult result = matcher.match(
        "worker-1",
        requirements());

    assertThat(result.isMatched()).isFalse();
    assertThat(result.getReason())
        .contains("jdbc/SINK")
        .contains("UNREACHABLE")
        .contains("connection refused");
  }

  @Test
  void acceptsMissingEvidenceInBestEffortModeButKeepsAudit() {
    OfflineWorkerPreflightRepository repository = mock(OfflineWorkerPreflightRepository.class);
    OfflineCapabilityProperties properties = new OfflineCapabilityProperties();
    properties.setReachabilityRequired(false);
    OfflineReachabilityMatcher matcher = new OfflineReachabilityMatcher(
        repository,
        properties,
        new ObjectMapper().findAndRegisterModules());

    OfflineReachabilityMatcher.MatchResult result = matcher.match(
        "worker-1",
        requirements());

    assertThat(result.isMatched()).isTrue();
    assertThat(result.getReason()).contains("BEST_EFFORT");
    assertThat(result.getAssignedReachabilityJson()).contains("MISSING");
  }

  @Test
  void rejectsExpiredEvidence() {
    OfflineWorkerPreflightRepository repository = mock(OfflineWorkerPreflightRepository.class);
    OfflineCapabilityProperties properties = new OfflineCapabilityProperties();
    properties.setReachabilityMaxStaleMillis(1_000L);
    OfflineReachabilityMatcher matcher = new OfflineReachabilityMatcher(
        repository,
        properties,
        new ObjectMapper().findAndRegisterModules());
    PreflightRecord source = record("SOURCE", "sha256:source", "REACHABLE");
    source.setCheckedAt(LocalDateTime.now().minusMinutes(1));
    when(repository.find("worker-1", "jdbc", "SOURCE", "sha256:source"))
        .thenReturn(source);

    OfflineReachabilityMatcher.MatchResult result = matcher.match(
        "worker-1",
        requirements());

    assertThat(result.isMatched()).isFalse();
    assertThat(result.getReason()).contains("已过期");
  }

  private PreflightRecord record(String role, String digest, String status) {
    return PreflightRecord.builder()
        .nodeId("worker-1")
        .connectorId("jdbc")
        .role(role)
        .optionsDigest(digest)
        .status(status)
        .durationMillis(12L)
        .checkedAt(LocalDateTime.now())
        .build();
  }

  private String requirements() {
    return "{\"version\":\"1\",\"status\":\"REQUIRED\",\"endpoints\":["
        + "{\"connectorId\":\"jdbc\",\"role\":\"SOURCE\","
        + "\"optionsDigest\":\"sha256:source\"},"
        + "{\"connectorId\":\"jdbc\",\"role\":\"SINK\","
        + "\"optionsDigest\":\"sha256:sink\"}]}";
  }
}
