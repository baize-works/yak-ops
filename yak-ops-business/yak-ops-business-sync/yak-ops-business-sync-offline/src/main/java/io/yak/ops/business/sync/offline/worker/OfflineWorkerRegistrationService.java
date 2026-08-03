package io.yak.ops.business.sync.offline.worker;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.config.OfflineWorkerRegistrationProperties;
import io.yak.ops.business.sync.offline.engine.LinkUpWorkerProbeClient;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository.NodeRecord;
import io.yak.ops.business.sync.offline.repository.OfflineWorkerRegistrationRepository;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerRegistrationModels.ConnectorCapabilityPayload;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerRegistrationModels.DeregisterRequest;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerRegistrationModels.HeartbeatRequest;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerRegistrationModels.LeaseResponse;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerRegistrationModels.RegisterRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

/** 动态 Link-Up Worker 注册、续租、实例接管和租约清理服务。 */
@ConditionalOnOfflineSyncEnabled
@Service
public class OfflineWorkerRegistrationService {

  private final OfflineNodeRepository nodeRepository;
  private final OfflineWorkerRegistrationRepository registrationRepository;
  private final LinkUpWorkerProbeClient probeClient;
  private final OfflineWorkerRegistrationProperties properties;
  private final ObjectMapper objectMapper;

  public OfflineWorkerRegistrationService(
      OfflineNodeRepository nodeRepository,
      OfflineWorkerRegistrationRepository registrationRepository,
      LinkUpWorkerProbeClient probeClient,
      OfflineWorkerRegistrationProperties properties,
      @Qualifier("offlineSyncJsonMapper") ObjectMapper objectMapper) {
    this.nodeRepository = nodeRepository;
    this.registrationRepository = registrationRepository;
    this.probeClient = probeClient;
    this.properties = properties;
    this.objectMapper = objectMapper;
  }

  @Transactional(transactionManager = "offlineSyncTransactionManager", rollbackFor = Exception.class)
  public LeaseResponse register(RegisterRequest request, String remoteAddress) {
    validateRegister(request);
    LocalDateTime now = LocalDateTime.now();
    String nodeId = request.getNodeId().trim();
    String instanceId = request.getInstanceId().trim();
    String baseUrl = probeClient.normalizeBaseUrl(request.getBaseUrl());
    requireAddressOwnership(nodeId, baseUrl);

    NodeRecord existing = nodeRepository.findForUpdate(nodeId);
    boolean takeover = false;
    boolean idempotent = false;
    String leaseId;
    long sequence;
    if (existing == null) {
      leaseId = UUID.randomUUID().toString();
      sequence = 0L;
    } else {
      if (!"DYNAMIC".equalsIgnoreCase(existing.getRegistrationMode())) {
        conflict("nodeId 已由 " + existing.getRegistrationMode() + " 模式管理：" + nodeId);
      }
      boolean active = active(existing, now);
      if (active && !instanceId.equals(existing.getRegistrationInstanceId())) {
        conflict("同一 nodeId 的旧 Worker 实例租约仍有效：" + nodeId);
      }
      idempotent = active && instanceId.equals(existing.getRegistrationInstanceId());
      takeover = !active && !instanceId.equals(existing.getRegistrationInstanceId());
      leaseId = idempotent && StringUtils.hasText(existing.getRegistrationLeaseId())
          ? existing.getRegistrationLeaseId()
          : UUID.randomUUID().toString();
      sequence = idempotent ? value(existing.getHeartbeatSequence(), 0L) : 0L;
    }

    NodeRecord record = existing == null ? NodeRecord.builder().build() : copy(existing);
    record.setNodeId(nodeId);
    if (existing == null || !StringUtils.hasText(existing.getNodeName())) {
      record.setNodeName(first(request.getNodeName(), nodeId));
    }
    record.setBaseUrl(baseUrl);
    record.setRegistrationMode("DYNAMIC");
    record.setRegistrationLeaseId(leaseId);
    record.setRegistrationInstanceId(instanceId);
    record.setRegistrationProtocolVersion(request.getProtocolVersion().trim());
    record.setLeaseExpiresAt(now.plusNanos(leaseDurationMillis() * 1_000_000L));
    record.setLastRegistrationTime(now);
    record.setHeartbeatSequence(sequence);
    if (existing == null) {
      boolean enabled = properties.isAutoEnable();
      record.setEnabled(enabled);
      record.setSchedulingStatus(enabled ? "ENABLED" : "DISABLED");
      record.setWeight(100);
      record.setLabelsJson(writeLabels(request.getLabels()));
      record.setCreateTime(now);
    }
    applyRuntime(
        record,
        request.getEngineVersion(),
        request.getStartedAtMillis(),
        request.getOfflineOnly(),
        request.getMaxConcurrentJobs(),
        request.getMaxQueuedJobs(),
        request.getRunningJobs(),
        request.getQueuedJobs(),
        instanceId,
        request.getConnectors(),
        now);
    record.setUpdateTime(now);
    nodeRepository.upsert(record);

    registrationRepository.recordEvent(
        nodeId,
        instanceId,
        leaseId,
        takeover ? "LEASE_TAKEOVER" : idempotent ? "REGISTER_RETRY" : "REGISTERED",
        remoteAddress,
        takeover ? "旧租约已过期，新实例接管" : "Worker 动态注册成功");
    return response(requireStored(nodeId));
  }

  @Transactional(transactionManager = "offlineSyncTransactionManager", rollbackFor = Exception.class)
  public LeaseResponse heartbeat(HeartbeatRequest request, String remoteAddress) {
    validateHeartbeat(request);
    LocalDateTime now = LocalDateTime.now();
    String nodeId = request.getNodeId().trim();
    NodeRecord existing = nodeRepository.findForUpdate(nodeId);
    validateLease(existing, request.getLeaseId(), request.getInstanceId(), now);
    long sequence = request.getSequence();
    if (sequence <= value(existing.getHeartbeatSequence(), 0L)) {
      conflict("心跳序列必须严格递增，当前=" + existing.getHeartbeatSequence()
          + "，请求=" + sequence);
    }

    String baseUrl = probeClient.normalizeBaseUrl(request.getBaseUrl());
    requireAddressOwnership(nodeId, baseUrl);
    NodeRecord record = copy(existing);
    record.setBaseUrl(baseUrl);
    record.setLeaseExpiresAt(now.plusNanos(leaseDurationMillis() * 1_000_000L));
    record.setHeartbeatSequence(sequence);
    applyRuntime(
        record,
        request.getEngineVersion(),
        request.getStartedAtMillis(),
        request.getOfflineOnly(),
        request.getMaxConcurrentJobs(),
        request.getMaxQueuedJobs(),
        request.getRunningJobs(),
        request.getQueuedJobs(),
        request.getInstanceId(),
        request.getConnectors(),
        now);
    record.setUpdateTime(now);
    nodeRepository.upsert(record);
    registrationRepository.recordEvent(
        record.getNodeId(),
        record.getRegistrationInstanceId(),
        record.getRegistrationLeaseId(),
        "HEARTBEAT",
        remoteAddress,
        "sequence=" + sequence);
    return response(requireStored(nodeId));
  }

  @Transactional(transactionManager = "offlineSyncTransactionManager", rollbackFor = Exception.class)
  public boolean deregister(DeregisterRequest request, String remoteAddress) {
    validateDeregister(request);
    LocalDateTime now = LocalDateTime.now();
    NodeRecord existing = nodeRepository.findForUpdate(request.getNodeId().trim());
    validateLease(existing, request.getLeaseId(), request.getInstanceId(), now);
    if (request.getSequence() != null
        && request.getSequence() <= value(existing.getHeartbeatSequence(), 0L)) {
      conflict("注销序列不能小于或等于最后心跳序列");
    }
    registrationRepository.revokeLease(existing.getNodeId(), now, "Worker 已主动注销动态租约");
    registrationRepository.recordEvent(
        existing.getNodeId(),
        existing.getRegistrationInstanceId(),
        existing.getRegistrationLeaseId(),
        "DEREGISTERED",
        remoteAddress,
        "Worker 主动注销");
    return true;
  }

  @Transactional(transactionManager = "offlineSyncTransactionManager", rollbackFor = Exception.class)
  public boolean revoke(String nodeId, String reason) {
    NodeRecord existing = nodeRepository.findForUpdate(nodeId);
    if (existing == null) {
      throw new IllegalArgumentException("Link-Up Worker 不存在：" + nodeId);
    }
    if (!"DYNAMIC".equalsIgnoreCase(existing.getRegistrationMode())) {
      throw new IllegalStateException("只有动态注册 Worker 才有可撤销租约");
    }
    LocalDateTime now = LocalDateTime.now();
    boolean updated = registrationRepository.revokeLease(
        nodeId,
        now,
        StringUtils.hasText(reason) ? reason : "管理员已撤销动态注册租约");
    registrationRepository.recordEvent(
        existing.getNodeId(),
        existing.getRegistrationInstanceId(),
        existing.getRegistrationLeaseId(),
        "LEASE_REVOKED",
        null,
        reason);
    return updated;
  }

  @Scheduled(
      initialDelayString = "${yak.sync.offline.registration.cleanup-initial-delay-millis:10000}",
      fixedDelayString = "${yak.sync.offline.registration.cleanup-delay-millis:10000}")
  public void cleanup() {
    if (!properties.isEnabled()) {
      return;
    }
    LocalDateTime now = LocalDateTime.now();
    registrationRepository.expireLeases(now);
    registrationRepository.cleanupNonces(now);
  }

  private void requireAddressOwnership(String nodeId, String baseUrl) {
    NodeRecord sameAddress = nodeRepository.findByBaseUrl(baseUrl);
    if (sameAddress != null && !nodeId.equals(sameAddress.getNodeId())) {
      conflict("Worker 地址已被其他节点使用：" + baseUrl);
    }
  }

  private NodeRecord requireStored(String nodeId) {
    NodeRecord stored = nodeRepository.find(nodeId);
    if (stored == null) {
      throw new IllegalStateException("动态 Worker 租约保存后无法读取：" + nodeId);
    }
    return stored;
  }

  private void applyRuntime(
      NodeRecord record,
      String engineVersion,
      Long startedAtMillis,
      Boolean offlineOnly,
      Integer maxConcurrentJobs,
      Integer maxQueuedJobs,
      Integer runningJobs,
      Integer queuedJobs,
      String instanceId,
      List<ConnectorCapabilityPayload> connectors,
      LocalDateTime now) {
    record.setWorkerInstanceId(instanceId);
    record.setEngineVersion(engineVersion);
    record.setStartedAtMillis(startedAtMillis);
    record.setOfflineOnly(offlineOnly);
    record.setStatus("UP");
    record.setMaxConcurrentJobs(positive(maxConcurrentJobs, 1));
    record.setMaxQueuedJobs(nonNegative(maxQueuedJobs, 0));
    record.setRunningJobs(nonNegative(runningJobs, 0));
    record.setQueuedJobs(nonNegative(queuedJobs, 0));
    record.setLastHeartbeatTime(now);
    record.setLastSuccessTime(now);
    record.setConsecutiveFailures(0);
    record.setLastErrorMessage(null);

    CapabilitySnapshot snapshot = capabilitySnapshot(
        record.getNodeId(), instanceId, engineVersion, connectors);
    if (snapshot == null) {
      record.setCapabilityStatus("UNKNOWN");
      record.setCapabilityDigest(null);
      record.setConnectorSchemasJson(null);
      record.setCapabilitySyncedAt(null);
      record.setCapabilityErrorMessage(null);
    } else {
      record.setCapabilityStatus("READY");
      record.setCapabilityDigest(snapshot.digest);
      record.setConnectorSchemasJson(snapshot.json);
      record.setCapabilitySyncedAt(now);
      record.setCapabilityErrorMessage(null);
    }
  }

  private CapabilitySnapshot capabilitySnapshot(
      String nodeId,
      String instanceId,
      String engineVersion,
      List<ConnectorCapabilityPayload> values) {
    if (values == null || values.isEmpty()) {
      return null;
    }
    List<ConnectorCapabilityPayload> connectors = new ArrayList<>(values);
    connectors.sort(Comparator
        .comparing((ConnectorCapabilityPayload value) -> normalizeId(value.getConnectorId()))
        .thenComparing(value -> normalizeRole(value.getRole())));

    ObjectNode root = objectMapper.createObjectNode();
    root.put("nodeId", nodeId);
    root.put("workerInstanceId", instanceId);
    root.put("engineVersion", engineVersion);
    ArrayNode items = root.putArray("connectors");
    for (ConnectorCapabilityPayload connector : connectors) {
      ObjectNode item = objectMapper.createObjectNode();
      item.put("connectorId", normalizeId(connector.getConnectorId()));
      item.put("role", normalizeRole(connector.getRole()));
      item.put("schemaVersion", text(connector.getSchemaVersion()));
      item.put("schemaFingerprint", text(connector.getSchemaFingerprint()));
      item.put("implementationVersion", text(connector.getImplementationVersion()));
      ArrayNode capabilities = item.putArray("capabilities");
      List<String> capabilityValues = connector.getCapabilities() == null
          ? Collections.emptyList()
          : new ArrayList<>(connector.getCapabilities());
      capabilityValues.stream()
          .filter(StringUtils::hasText)
          .map(value -> value.trim().toUpperCase(Locale.ROOT))
          .distinct()
          .sorted()
          .forEach(capabilities::add);
      items.add(item);
    }
    String json = write(root, "序列化动态 Worker 能力快照失败");
    String canonicalConnectors = write(items, "序列化动态 Worker 能力摘要失败");
    return new CapabilitySnapshot(json, "sha256:" + sha256(canonicalConnectors));
  }

  private LeaseResponse response(NodeRecord node) {
    return LeaseResponse.builder()
        .protocolVersion(OfflineWorkerRegistrationModels.PROTOCOL_VERSION)
        .nodeId(node.getNodeId())
        .instanceId(node.getRegistrationInstanceId())
        .leaseId(node.getRegistrationLeaseId())
        .leaseExpiresAt(node.getLeaseExpiresAt())
        .heartbeatIntervalMillis(heartbeatIntervalMillis())
        .heartbeatSequence(value(node.getHeartbeatSequence(), 0L))
        .serverTimeMillis(System.currentTimeMillis())
        .enabled(node.getEnabled())
        .schedulingStatus(node.getSchedulingStatus())
        .build();
  }

  private void validateRegister(RegisterRequest request) {
    if (request == null) {
      badRequest("注册参数不能为空");
    }
    validateProtocol(request.getProtocolVersion());
    required(request.getNodeId(), "nodeId");
    required(request.getInstanceId(), "instanceId");
    required(request.getBaseUrl(), "baseUrl");
    if (!Boolean.TRUE.equals(request.getOfflineOnly())) {
      badRequest("动态注册节点必须是 offlineOnly Worker");
    }
  }

  private void validateHeartbeat(HeartbeatRequest request) {
    if (request == null) {
      badRequest("心跳参数不能为空");
    }
    validateProtocol(request.getProtocolVersion());
    required(request.getLeaseId(), "leaseId");
    required(request.getNodeId(), "nodeId");
    required(request.getInstanceId(), "instanceId");
    required(request.getBaseUrl(), "baseUrl");
    if (request.getSequence() == null || request.getSequence() <= 0L) {
      badRequest("heartbeat sequence 必须大于 0");
    }
    if (!Boolean.TRUE.equals(request.getOfflineOnly())) {
      badRequest("动态注册节点必须是 offlineOnly Worker");
    }
  }

  private void validateDeregister(DeregisterRequest request) {
    if (request == null) {
      badRequest("注销参数不能为空");
    }
    validateProtocol(request.getProtocolVersion());
    required(request.getLeaseId(), "leaseId");
    required(request.getNodeId(), "nodeId");
    required(request.getInstanceId(), "instanceId");
  }

  private void validateProtocol(String version) {
    if (!OfflineWorkerRegistrationModels.PROTOCOL_VERSION.equals(version)) {
      badRequest("不支持的动态注册协议版本：" + version);
    }
  }

  private void validateLease(
      NodeRecord node,
      String leaseId,
      String instanceId,
      LocalDateTime now) {
    if (node == null || !"DYNAMIC".equalsIgnoreCase(node.getRegistrationMode())) {
      conflict("动态注册 Worker 不存在");
    }
    if (!leaseId.equals(node.getRegistrationLeaseId())
        || !instanceId.equals(node.getRegistrationInstanceId())) {
      conflict("动态注册租约或 Worker 实例不匹配");
    }
    if (!active(node, now)) {
      conflict("动态注册租约已过期，请重新注册");
    }
  }

  private boolean active(NodeRecord node, LocalDateTime now) {
    return node != null
        && StringUtils.hasText(node.getRegistrationLeaseId())
        && node.getLeaseExpiresAt() != null
        && node.getLeaseExpiresAt().isAfter(now);
  }

  private NodeRecord copy(NodeRecord source) {
    return NodeRecord.builder()
        .nodeId(source.getNodeId())
        .nodeName(source.getNodeName())
        .baseUrl(source.getBaseUrl())
        .registrationMode(source.getRegistrationMode())
        .registrationLeaseId(source.getRegistrationLeaseId())
        .registrationInstanceId(source.getRegistrationInstanceId())
        .registrationProtocolVersion(source.getRegistrationProtocolVersion())
        .leaseExpiresAt(source.getLeaseExpiresAt())
        .lastRegistrationTime(source.getLastRegistrationTime())
        .heartbeatSequence(source.getHeartbeatSequence())
        .enabled(source.getEnabled())
        .schedulingStatus(source.getSchedulingStatus())
        .weight(source.getWeight())
        .labelsJson(source.getLabelsJson())
        .workerInstanceId(source.getWorkerInstanceId())
        .engineVersion(source.getEngineVersion())
        .startedAtMillis(source.getStartedAtMillis())
        .offlineOnly(source.getOfflineOnly())
        .status(source.getStatus())
        .maxConcurrentJobs(source.getMaxConcurrentJobs())
        .maxQueuedJobs(source.getMaxQueuedJobs())
        .runningJobs(source.getRunningJobs())
        .queuedJobs(source.getQueuedJobs())
        .lastHeartbeatTime(source.getLastHeartbeatTime())
        .lastSuccessTime(source.getLastSuccessTime())
        .consecutiveFailures(source.getConsecutiveFailures())
        .lastErrorMessage(source.getLastErrorMessage())
        .capabilityStatus(source.getCapabilityStatus())
        .capabilityDigest(source.getCapabilityDigest())
        .connectorSchemasJson(source.getConnectorSchemasJson())
        .capabilitySyncedAt(source.getCapabilitySyncedAt())
        .capabilityErrorMessage(source.getCapabilityErrorMessage())
        .createTime(source.getCreateTime())
        .updateTime(source.getUpdateTime())
        .build();
  }

  private String writeLabels(Map<String, String> labels) {
    Map<String, String> normalized = new TreeMap<>();
    if (labels != null) {
      labels.forEach((key, value) -> {
        if (StringUtils.hasText(key)) {
          normalized.put(key.trim(), value == null ? "" : value.trim());
        }
      });
    }
    try {
      return objectMapper.writeValueAsString(normalized);
    } catch (JsonProcessingException exception) {
      throw new IllegalArgumentException("Worker 注册标签无法序列化", exception);
    }
  }

  private String write(ObjectNode value, String message) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException(message, exception);
    }
  }

  private String write(ArrayNode value, String message) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException(message, exception);
    }
  }

  private String normalizeId(String value) {
    required(value, "connectorId");
    return value.trim().toLowerCase(Locale.ROOT);
  }

  private String normalizeRole(String value) {
    required(value, "connector role");
    String normalized = value.trim().toUpperCase(Locale.ROOT);
    if (!"SOURCE".equals(normalized) && !"SINK".equals(normalized)) {
      badRequest("Connector role 仅支持 SOURCE 或 SINK");
    }
    return normalized;
  }

  private long heartbeatIntervalMillis() {
    return Math.max(5_000L, Math.min(60_000L, properties.getHeartbeatIntervalMillis()));
  }

  private long leaseDurationMillis() {
    return Math.max(heartbeatIntervalMillis() * 3L, properties.getLeaseDurationMillis());
  }

  private int positive(Integer value, int fallback) {
    return value == null || value <= 0 ? fallback : value;
  }

  private int nonNegative(Integer value, int fallback) {
    return value == null || value < 0 ? fallback : value;
  }

  private long value(Long value, long fallback) {
    return value == null ? fallback : value;
  }

  private String first(String value, String fallback) {
    return StringUtils.hasText(value) ? value.trim() : fallback;
  }

  private String text(String value) {
    return value == null ? "" : value.trim();
  }

  private void required(String value, String field) {
    if (!StringUtils.hasText(value)) {
      badRequest(field + " 不能为空");
    }
  }

  private String sha256(String value) {
    try {
      return HexFormat.of().formatHex(
          MessageDigest.getInstance("SHA-256")
              .digest(value.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception exception) {
      throw new IllegalStateException("生成 Worker 能力摘要失败", exception);
    }
  }

  private void badRequest(String message) {
    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }

  private void conflict(String message) {
    throw new ResponseStatusException(HttpStatus.CONFLICT, message);
  }

  private static final class CapabilitySnapshot {
    private final String json;
    private final String digest;

    private CapabilitySnapshot(String json, String digest) {
      this.json = json;
      this.digest = digest;
    }
  }
}
