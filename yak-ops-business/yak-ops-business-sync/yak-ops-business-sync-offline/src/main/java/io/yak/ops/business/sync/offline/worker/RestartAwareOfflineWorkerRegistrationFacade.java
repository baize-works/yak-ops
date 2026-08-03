package io.yak.ops.business.sync.offline.worker;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.engine.LinkUpWorkerProbeClient;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository.NodeRecord;
import io.yak.ops.business.sync.offline.repository.OfflineWorkerRegistrationRepository;
import io.yak.ops.business.sync.offline.repository.OfflineWorkerRestartTakeoverRepository;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerRegistrationModels.DeregisterRequest;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerRegistrationModels.HeartbeatRequest;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerRegistrationModels.LeaseResponse;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerRegistrationModels.RegisterRequest;
import java.time.LocalDateTime;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

/**
 * 为动态注册增加受控重启接管。
 *
 * <p>普通注册仍由 {@link OfflineWorkerRegistrationService} 完成。只有旧租约仍有效、nodeId 和
 * advertised base URL 相同、且新进程启动时间严格更新时，才会条件作废旧租约并重新注册。
 */
@ConditionalOnOfflineSyncEnabled
@Service
public class RestartAwareOfflineWorkerRegistrationFacade {

  private final OfflineWorkerRegistrationService registrationService;
  private final OfflineNodeRepository nodeRepository;
  private final OfflineWorkerRegistrationRepository registrationRepository;
  private final OfflineWorkerRestartTakeoverRepository takeoverRepository;
  private final OfflineWorkerRestartRecoveryService recoveryService;
  private final LinkUpWorkerProbeClient probeClient;

  public RestartAwareOfflineWorkerRegistrationFacade(
      OfflineWorkerRegistrationService registrationService,
      OfflineNodeRepository nodeRepository,
      OfflineWorkerRegistrationRepository registrationRepository,
      OfflineWorkerRestartTakeoverRepository takeoverRepository,
      OfflineWorkerRestartRecoveryService recoveryService,
      LinkUpWorkerProbeClient probeClient) {
    this.registrationService = registrationService;
    this.nodeRepository = nodeRepository;
    this.registrationRepository = registrationRepository;
    this.takeoverRepository = takeoverRepository;
    this.recoveryService = recoveryService;
    this.probeClient = probeClient;
  }

  public LeaseResponse register(RegisterRequest request, String remoteAddress) {
    try {
      return registrationService.register(request, remoteAddress);
    } catch (ResponseStatusException exception) {
      if (exception.getStatusCode() != HttpStatus.CONFLICT) {
        throw exception;
      }

      RestartCandidate candidate = restartCandidate(request);
      if (candidate == null) {
        throw exception;
      }

      LocalDateTime now = LocalDateTime.now();
      String reason = "检测到同节点同地址的较新 Link-Up 进程，旧实例已被重启接管："
          + candidate.previousInstanceId + " -> " + request.getInstanceId().trim();
      boolean fenced = takeoverRepository.fenceActiveLease(
          candidate.nodeId,
          candidate.previousLeaseId,
          candidate.previousInstanceId,
          candidate.baseUrl,
          request.getStartedAtMillis(),
          now,
          reason);

      if (!fenced) {
        // 注册状态已被其他并发请求改变，交回基础注册逻辑重新判定。
        return registrationService.register(request, remoteAddress);
      }

      registrationRepository.recordEvent(
          candidate.nodeId,
          candidate.previousInstanceId,
          candidate.previousLeaseId,
          "RESTART_FENCED",
          remoteAddress,
          reason);

      LeaseResponse response = registrationService.register(request, remoteAddress);
      recoveryService.recover(
          candidate.nodeId,
          candidate.previousInstanceId,
          request.getInstanceId().trim());
      return response;
    }
  }

  public LeaseResponse heartbeat(HeartbeatRequest request, String remoteAddress) {
    return registrationService.heartbeat(request, remoteAddress);
  }

  public boolean deregister(DeregisterRequest request, String remoteAddress) {
    return registrationService.deregister(request, remoteAddress);
  }

  private RestartCandidate restartCandidate(RegisterRequest request) {
    if (request == null
        || !StringUtils.hasText(request.getNodeId())
        || !StringUtils.hasText(request.getInstanceId())
        || !StringUtils.hasText(request.getBaseUrl())
        || request.getStartedAtMillis() == null
        || request.getStartedAtMillis() <= 0L) {
      return null;
    }

    String nodeId = request.getNodeId().trim();
    String instanceId = request.getInstanceId().trim();
    String baseUrl = probeClient.normalizeBaseUrl(request.getBaseUrl());
    NodeRecord existing = nodeRepository.find(nodeId);
    LocalDateTime now = LocalDateTime.now();

    if (existing == null
        || !"DYNAMIC".equalsIgnoreCase(existing.getRegistrationMode())
        || !StringUtils.hasText(existing.getRegistrationLeaseId())
        || !StringUtils.hasText(existing.getRegistrationInstanceId())
        || existing.getLeaseExpiresAt() == null
        || !existing.getLeaseExpiresAt().isAfter(now)
        || instanceId.equals(existing.getRegistrationInstanceId())
        || !baseUrl.equals(existing.getBaseUrl())
        || existing.getStartedAtMillis() == null
        || request.getStartedAtMillis() <= existing.getStartedAtMillis()) {
      return null;
    }

    return new RestartCandidate(
        nodeId,
        baseUrl,
        existing.getRegistrationLeaseId(),
        existing.getRegistrationInstanceId());
  }

  private static final class RestartCandidate {
    private final String nodeId;
    private final String baseUrl;
    private final String previousLeaseId;
    private final String previousInstanceId;

    private RestartCandidate(
        String nodeId,
        String baseUrl,
        String previousLeaseId,
        String previousInstanceId) {
      this.nodeId = nodeId;
      this.baseUrl = baseUrl;
      this.previousLeaseId = previousLeaseId;
      this.previousInstanceId = previousInstanceId;
    }
  }
}
