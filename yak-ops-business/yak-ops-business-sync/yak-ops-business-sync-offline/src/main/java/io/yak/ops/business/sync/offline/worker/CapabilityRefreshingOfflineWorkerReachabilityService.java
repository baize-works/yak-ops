package io.yak.ops.business.sync.offline.worker;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.config.OfflineCapabilityProperties;
import io.yak.ops.business.sync.offline.engine.LinkUpConnectorPreflightClient;
import io.yak.ops.business.sync.offline.repository.OfflineDefinitionCatalogRepository.DefinitionVersion;
import io.yak.ops.business.sync.offline.repository.OfflineNodeRepository;
import io.yak.ops.business.sync.offline.repository.OfflineWorkerPreflightRepository;
import io.yak.ops.business.sync.offline.service.OfflineJobDefinitionService;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobDefinitionPO;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

/**
 * 能力调度使用的主预热服务：先刷新 Worker Connector 能力，再执行 Worker 视角预检。
 *
 * @author weifuwan
 */
@Primary
@ConditionalOnOfflineSyncEnabled
@Service
public class CapabilityRefreshingOfflineWorkerReachabilityService
    extends OfflineWorkerReachabilityService {

  private final OfflineWorkerCapabilityService capabilityService;

  public CapabilityRefreshingOfflineWorkerReachabilityService(
      OfflineJobDefinitionService definitionService,
      OfflineNodeRepository nodeRepository,
      OfflineWorkerPreflightRepository preflightRepository,
      OfflineCapabilityMatcher capabilityMatcher,
      OfflineCapabilityRequirementResolver capabilityResolver,
      LinkUpConnectorPreflightClient preflightClient,
      OfflineCapabilityProperties properties,
      @Qualifier("offlineSyncJsonMapper") ObjectMapper objectMapper,
      OfflineWorkerCapabilityService capabilityService) {
    super(
        definitionService,
        nodeRepository,
        preflightRepository,
        capabilityMatcher,
        capabilityResolver,
        preflightClient,
        properties,
        objectMapper);
    this.capabilityService = capabilityService;
  }

  @Override
  public String preheat(Long definitionId) {
    capabilityService.scheduledRefresh();
    return super.preheat(definitionId);
  }

  @Override
  public String requirements(
      OfflineJobDefinitionPO definition,
      DefinitionVersion version) {
    return super.requirements(definition, version);
  }
}
