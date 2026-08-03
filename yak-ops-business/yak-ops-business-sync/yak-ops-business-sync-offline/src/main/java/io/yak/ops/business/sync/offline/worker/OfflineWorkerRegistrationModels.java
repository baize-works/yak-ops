package io.yak.ops.business.sync.offline.worker;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Link-Up Worker 主动注册协议模型。 */
public final class OfflineWorkerRegistrationModels {

  public static final String PROTOCOL_VERSION = "link-up-registration/v1";

  private OfflineWorkerRegistrationModels() {
  }

  @Data
  @NoArgsConstructor
  public static class RegisterRequest {
    private String protocolVersion;
    private String nodeId;
    private String nodeName;
    private String instanceId;
    private String baseUrl;
    private String engineVersion;
    private Long startedAtMillis;
    private Boolean offlineOnly;
    private Integer maxConcurrentJobs;
    private Integer maxQueuedJobs;
    private Integer runningJobs;
    private Integer queuedJobs;
    private Map<String, String> labels;
    private List<ConnectorCapabilityPayload> connectors;
  }

  @Data
  @NoArgsConstructor
  public static class HeartbeatRequest {
    private String protocolVersion;
    private String leaseId;
    private String nodeId;
    private String instanceId;
    private Long sequence;
    private String baseUrl;
    private String engineVersion;
    private Long startedAtMillis;
    private Boolean offlineOnly;
    private Integer maxConcurrentJobs;
    private Integer maxQueuedJobs;
    private Integer runningJobs;
    private Integer queuedJobs;
    private List<ConnectorCapabilityPayload> connectors;
  }

  @Data
  @NoArgsConstructor
  public static class DeregisterRequest {
    private String protocolVersion;
    private String leaseId;
    private String nodeId;
    private String instanceId;
    private Long sequence;
  }

  @Data
  @NoArgsConstructor
  public static class ConnectorCapabilityPayload {
    private String connectorId;
    private String role;
    private String schemaVersion;
    private String schemaFingerprint;
    private String implementationVersion;
    private List<String> capabilities;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class LeaseResponse {
    private String protocolVersion;
    private String nodeId;
    private String instanceId;
    private String leaseId;
    private LocalDateTime leaseExpiresAt;
    private Long heartbeatIntervalMillis;
    private Long serverTimeMillis;
    private Boolean enabled;
    private String schedulingStatus;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class LeaseAdminView {
    private String nodeId;
    private String registrationMode;
    private String leaseStatus;
    private LocalDateTime leaseExpiresAt;
    private LocalDateTime lastRegistrationTime;
    private Long heartbeatSequence;
    private String protocolVersion;
  }
}
