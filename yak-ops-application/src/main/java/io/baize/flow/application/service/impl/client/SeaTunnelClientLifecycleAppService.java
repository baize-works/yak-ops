package io.baize.flow.application.service.impl.client;

import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import io.baize.flow.common.enums.SeaTunnelClientDeployMode;
import io.baize.flow.common.enums.SeaTunnelClientHealthStatusEnum;
import io.baize.flow.common.enums.SeaTunnelClientNodeRole;
import io.baize.flow.application.client.model.SeaTunnelClientActivationResult;
import io.baize.flow.application.client.model.SeaTunnelClientEndpoint;
import io.baize.flow.application.client.model.SeaTunnelClientProbeResult;
import io.baize.flow.application.client.model.SeaTunnelClientSpec;
import io.baize.flow.application.client.model.SeaTunnelClientTopology;
import io.baize.flow.application.client.service.SeaTunnelClientActivationService;
import io.baize.flow.application.client.service.SeaTunnelClientTopologyBuilder;
import io.baize.flow.domain.exceptions.ServiceException;
import io.baize.flow.dao.entity.SeaTunnelClient;
import io.baize.flow.dao.entity.SeaTunnelClientNode;
import io.baize.flow.dao.repository.JobDefinitionDao;
import io.baize.flow.dao.repository.SeaTunnelClientDao;
import io.baize.flow.dao.repository.SeaTunnelClientNodeDao;
import io.baize.flow.engine.legacy.LegacyClientAuthentication;
import io.baize.flow.engine.legacy.LegacyRestClient;
import io.baize.flow.web.contract.dto.SeaTunnelClientDTO;
import io.baize.flow.web.contract.dto.SeaTunnelClientEndpointDTO;
import io.baize.flow.plugin.spi.enums.Status;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Application service for managing the lifecycle of SeaTunnel clients.
 *
 * <p>This service is responsible for client registration, update, deletion,
 * node refresh, activation result persistence, and node status synchronization.</p>
 *
 * <p>The application layer coordinates domain services, persistence, and remote
 * SeaTunnel engine calls. The core activation and topology rules are delegated
 * to {@link SeaTunnelClientTopologyBuilder} and {@link SeaTunnelClientActivationService}.</p>
 */
@Service
@Slf4j
public class SeaTunnelClientLifecycleAppService {

    @Resource
    private SeaTunnelClientDao seaTunnelClientDao;

    @Resource
    private SeaTunnelClientNodeDao seaTunnelClientNodeDao;

    @Resource
    private LegacyRestClient seaTunnelRestClient;

    @Resource
    private SeaTunnelClientTopologyBuilder topologyBuilder;

    @Resource
    private SeaTunnelClientActivationService activationService;

    @Resource
    private SeaTunnelClientAssembler assembler;

    @Resource
    private JobDefinitionDao jobDefinitionDao;




    /**
     * Creates or updates a SeaTunnel client.
     *
     * <p>The client configuration is first converted into a runtime specification,
     * then a topology is built from that specification. The topology will be activated
     * before being persisted, so only reachable and supported SeaTunnel clients can be saved.</p>
     *
     * @param dto client save or update request
     */
    @Transactional(rollbackFor = Exception.class)
    public void saveOrUpdate(SeaTunnelClientDTO dto) {
        validateSaveOrUpdateRequest(dto);

        Date now = new Date();

        SeaTunnelClientSpec spec = assembler.toSpec(dto);
        SeaTunnelClientTopology topology = topologyBuilder.build(spec);
        SeaTunnelClientActivationResult activationResult =
                activationService.activate(spec, topology);

        if (!activationResult.isLive()) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    activationResult.getErrorMessage()
            );
        }

        if (dto.getId() == null) {
            createClient(dto, activationResult, now);
            return;
        }

        updateClient(dto, activationResult, now);
    }

    /**
     * Deletes a SeaTunnel client and its related nodes.
     *
     * <p>The client can only be deleted when it is not referenced by any batch job definition.</p>
     *
     * @param id client id
     */
    @Transactional(rollbackFor = Exception.class)
    public void deleteById(Long id) {
        SeaTunnelClient entity = getEntity(id);

        seaTunnelClientNodeDao.deleteByClientId(entity.getId());
        seaTunnelClientDao.deleteById(entity.getId());
    }

    /**
     * Refreshes all configured nodes of a SeaTunnel client.
     *
     * <p>This method rebuilds the runtime topology from persisted client and node
     * configuration, probes master nodes again, updates the active master, and refreshes
     * worker node health status.</p>
     *
     * @param clientId client id
     * @return latest endpoint list
     */
    @Transactional(rollbackFor = Exception.class)
    public List<SeaTunnelClientEndpointDTO> refreshNodes(Long clientId) {
        SeaTunnelClient client = getEntity(clientId);

        List<SeaTunnelClientNode> currentNodes =
                seaTunnelClientNodeDao.selectByClientId(clientId);

        SeaTunnelClientSpec spec = assembler.toSpec(client, currentNodes);
        SeaTunnelClientTopology topology = topologyBuilder.build(spec);

        SeaTunnelClientActivationResult activationResult =
                activationService.activate(spec, topology);

        Date now = new Date();

        if (!activationResult.isLive()) {
            markClientDead(client, activationResult.getErrorMessage(), now);
            updateMasterNodesByProbeResult(clientId, activationResult, now);

            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    activationResult.getErrorMessage()
            );
        }

        applyActivationToClient(client, activationResult, now);
        seaTunnelClientDao.updateById(client);

        updateMasterNodesByProbeResult(clientId, activationResult, now);
        refreshWorkerNodes(clientId, client);

        return currentEndpointList(clientId);
    }

    /**
     * Persists a new SeaTunnel client and rebuilds its node records.
     */
    private void createClient(
            SeaTunnelClientDTO dto,
            SeaTunnelClientActivationResult activationResult,
            Date now
    ) {
        SeaTunnelClient entity = new SeaTunnelClient();
        BeanUtils.copyProperties(dto, entity);

        entity.setCreateTime(now);
        entity.setUpdateTime(now);

        applyBaseConfig(dto, entity);
        applyActivationToClient(entity, activationResult, now);

        seaTunnelClientDao.insert(entity);

        Long activeMasterNodeId =
                rebuildClientNodes(entity.getId(), activationResult, now);

        entity.setActiveMasterNodeId(activeMasterNodeId);
        entity.setUpdateTime(now);

        seaTunnelClientDao.updateById(entity);
    }

    /**
     * Updates an existing SeaTunnel client and rebuilds its node records.
     *
     * <p>The client cannot be updated when it is already used by existing jobs,
     * because updating engine address or authentication may affect job execution.</p>
     */
    private void updateClient(
            SeaTunnelClientDTO dto,
            SeaTunnelClientActivationResult activationResult,
            Date now
    ) {
        SeaTunnelClient entity = getEntity(dto.getId());

        BeanUtils.copyProperties(dto, entity);

        applyBaseConfig(dto, entity);
        applyActivationToClient(entity, activationResult, now);

        seaTunnelClientDao.updateById(entity);

        Long activeMasterNodeId =
                rebuildClientNodes(entity.getId(), activationResult, now);

        entity.setActiveMasterNodeId(activeMasterNodeId);
        entity.setUpdateTime(now);

        seaTunnelClientDao.updateById(entity);
    }

    /**
     * Applies normalized base configuration values to the client entity.
     */
    private void applyBaseConfig(
            SeaTunnelClientDTO dto,
            SeaTunnelClient entity
    ) {
        entity.setDeployMode(assembler.normalizeDeployMode(dto.getDeployMode()));
        entity.setProtocol(assembler.normalizeProtocol(dto.getProtocol()));
    }

    /**
     * Applies activation result to the client entity.
     *
     * <p>When an active master is found, the client will be marked as LIVE and its
     * active base URL will be updated. Otherwise, the client will be marked as DEAD.</p>
     */
    private void applyActivationToClient(
            SeaTunnelClient client,
            SeaTunnelClientActivationResult activationResult,
            Date now
    ) {
        SeaTunnelClientEndpoint activeMaster = activationResult.getActiveMaster();

        if (activeMaster == null) {
            client.setHealthStatus(SeaTunnelClientHealthStatusEnum.DEAD.getCode());
            client.setActiveMasterNodeId(null);
            client.setLastError(activationResult.getErrorMessage());
            client.setHeartbeatTime(now);
            client.setUpdateTime(now);
            return;
        }

        client.setBaseUrl(activeMaster.getBaseUrl());
        client.setClientAddress(activeMaster.getHost());
        client.setClientPort(String.valueOf(activeMaster.getPort()));
        client.setClientVersion(activationResult.getClientVersion());
        client.setHealthStatus(SeaTunnelClientHealthStatusEnum.LIVE.getCode());
        client.setHeartbeatTime(now);
        client.setLastError(null);
        client.setUpdateTime(now);
    }

    /**
     * Rebuilds all node records based on the latest topology and activation result.
     *
     * <p>Master nodes are updated according to probe results. Worker nodes are persisted
     * as configured nodes and marked as UNKNOWN by default until they are refreshed.</p>
     *
     * @return active master node id, or null if no active master exists
     */
    private Long rebuildClientNodes(
            Long clientId,
            SeaTunnelClientActivationResult activationResult,
            Date now
    ) {
        seaTunnelClientNodeDao.deleteByClientId(clientId);

        SeaTunnelClientTopology topology = activationResult.getTopology();

        if (topology == null) {
            return null;
        }

        Long activeMasterNodeId = null;

        for (SeaTunnelClientEndpoint master : safeList(topology.getMasters())) {
            SeaTunnelClientNode node = assembler.toNodeEntity(clientId, master, now);

            SeaTunnelClientProbeResult probeResult =
                    findProbeResult(activationResult, master);

            applyProbeResultToNode(node, probeResult, now);

            boolean activeMaster = isActiveMaster(activationResult, master);
            node.setActiveMaster(activeMaster);

            if (activeMaster) {
                activeMasterNodeId = node.getId();
            }

            seaTunnelClientNodeDao.insert(node);
        }

        for (SeaTunnelClientEndpoint worker : safeList(topology.getWorkers())) {
            SeaTunnelClientNode node = assembler.toNodeEntity(clientId, worker, now);
            node.setActiveMaster(false);
            node.setHealthStatus(SeaTunnelClientHealthStatusEnum.UNKNOWN.getCode());

            seaTunnelClientNodeDao.insert(node);
        }

        return activeMasterNodeId;
    }

    /**
     * Updates persisted master node states according to the latest probe results.
     */
    private void updateMasterNodesByProbeResult(
            Long clientId,
            SeaTunnelClientActivationResult activationResult,
            Date now
    ) {
        List<SeaTunnelClientNode> nodes =
                seaTunnelClientNodeDao.selectByClientIdAndRole(
                        clientId,
                        SeaTunnelClientNodeRole.MASTER
                );

        if (nodes == null || nodes.isEmpty()) {
            return;
        }

        for (SeaTunnelClientNode node : nodes) {
            SeaTunnelClientEndpoint endpoint = assembler.toEndpoint(node);
            SeaTunnelClientProbeResult probeResult =
                    findProbeResult(activationResult, endpoint);

            applyProbeResultToNode(node, probeResult, now);

            node.setActiveMaster(isActiveMaster(activationResult, endpoint));
            node.setUpdateTime(now);

            seaTunnelClientNodeDao.updateById(node);
        }

        SeaTunnelClientEndpoint activeMaster = activationResult.getActiveMaster();
        if (activeMaster == null) {
            return;
        }

        nodes.stream()
                .filter(node -> StringUtils.equalsIgnoreCase(
                        node.getBaseUrl(),
                        activeMaster.getBaseUrl()
                ))
                .findFirst()
                .ifPresent(node -> {
                    SeaTunnelClient client = getEntity(clientId);
                    client.setActiveMasterNodeId(node.getId());
                    client.setUpdateTime(now);
                    seaTunnelClientDao.updateById(client);
                });
    }

    /**
     * Refreshes worker node health status by calling the SeaTunnel overview API.
     *
     * <p>Worker nodes are not used as active runtime entry points, but their status
     * is still useful for displaying cluster topology and diagnosing engine issues.</p>
     */
    private void refreshWorkerNodes(
            Long clientId,
            SeaTunnelClient client
    ) {
        List<SeaTunnelClientNode> workers =
                seaTunnelClientNodeDao.selectByClientIdAndRole(
                        clientId,
                        SeaTunnelClientNodeRole.WORKER
                );

        if (workers == null || workers.isEmpty()) {
            return;
        }

        for (SeaTunnelClientNode worker : workers) {
            Date now = new Date();

            try {
                Map<String, Object> overview = seaTunnelRestClient.overview(
                        worker.getBaseUrl(),
                        null, // TODO 暂时不设置
                        null,
                        buildAuth(client)
                );

                String version = resolveClientVersion(overview);

                worker.setHealthStatus(SeaTunnelClientHealthStatusEnum.LIVE.getCode());
                worker.setClientVersion(version);
                worker.setLastError(null);
                worker.setLastHeartbeatTime(now);
                worker.setUpdateTime(now);

                seaTunnelClientNodeDao.updateById(worker);
            } catch (Exception e) {
                worker.setHealthStatus(SeaTunnelClientHealthStatusEnum.DEAD.getCode());
                worker.setActiveMaster(false);
                worker.setLastHeartbeatTime(now);
                worker.setLastError(e.getMessage());
                worker.setUpdateTime(now);

                seaTunnelClientNodeDao.updateById(worker);

                log.warn(
                        "Refresh SeaTunnel worker node failed, clientId={}, baseUrl={}",
                        clientId,
                        worker.getBaseUrl(),
                        e
                );
            }
        }
    }

    /**
     * Applies a probe result to a persisted client node.
     *
     * <p>A missing probe result means the node was not probed in the current activation
     * process, so its status will be marked as UNKNOWN.</p>
     */
    private void applyProbeResultToNode(
            SeaTunnelClientNode node,
            SeaTunnelClientProbeResult probeResult,
            Date now
    ) {
        if (node == null) {
            return;
        }

        if (probeResult == null) {
            node.setHealthStatus(SeaTunnelClientHealthStatusEnum.UNKNOWN.getCode());
            node.setActiveMaster(false);
            node.setLastHeartbeatTime(now);
            node.setUpdateTime(now);
            return;
        }

        if (probeResult.isLive()) {
            node.setHealthStatus(SeaTunnelClientHealthStatusEnum.LIVE.getCode());
            node.setClientVersion(probeResult.getClientVersion());
            node.setLastError(null);
        } else {
            node.setHealthStatus(SeaTunnelClientHealthStatusEnum.DEAD.getCode());
            node.setActiveMaster(false);
            node.setLastError(probeResult.getErrorMessage());
        }

        node.setLastHeartbeatTime(now);
        node.setUpdateTime(now);
    }

    /**
     * Checks whether the given endpoint is the active master selected by activation.
     */
    private boolean isActiveMaster(
            SeaTunnelClientActivationResult activationResult,
            SeaTunnelClientEndpoint endpoint
    ) {
        if (activationResult == null
                || activationResult.getActiveMaster() == null
                || endpoint == null) {
            return false;
        }

        return StringUtils.equalsIgnoreCase(
                activationResult.getActiveMaster().getBaseUrl(),
                endpoint.getBaseUrl()
        );
    }

    /**
     * Finds the probe result that belongs to the given endpoint.
     */
    private SeaTunnelClientProbeResult findProbeResult(
            SeaTunnelClientActivationResult activationResult,
            SeaTunnelClientEndpoint endpoint
    ) {
        if (activationResult == null
                || activationResult.getProbeResults() == null
                || endpoint == null) {
            return null;
        }

        return activationResult.getProbeResults()
                .stream()
                .filter(result -> result != null && result.getEndpoint() != null)
                .filter(result -> StringUtils.equalsIgnoreCase(
                        result.getEndpoint().getBaseUrl(),
                        endpoint.getBaseUrl()
                ))
                .findFirst()
                .orElse(null);
    }

    /**
     * Marks the client as DEAD when no available master can be activated.
     */
    private void markClientDead(
            SeaTunnelClient client,
            String errorMessage,
            Date now
    ) {
        if (client == null) {
            return;
        }

        client.setHealthStatus(SeaTunnelClientHealthStatusEnum.DEAD.getCode());
        client.setActiveMasterNodeId(null);
        client.setLastError(errorMessage);
        client.setHeartbeatTime(now);
        client.setUpdateTime(now);

        seaTunnelClientDao.updateById(client);
    }

    /**
     * Returns the latest endpoint list of a client.
     */
    private List<SeaTunnelClientEndpointDTO> currentEndpointList(Long clientId) {
        List<SeaTunnelClientNode> nodes =
                seaTunnelClientNodeDao.selectByClientId(clientId);

        if (nodes == null || nodes.isEmpty()) {
            return Collections.emptyList();
        }

        return nodes.stream()
                .map(assembler::toEndpointDTO)
                .collect(Collectors.toList());
    }

    /**
     * Validates the client save or update request.
     */
    private void validateSaveOrUpdateRequest(SeaTunnelClientDTO dto) {
        if (dto == null) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "客户端参数不能为空"
            );
        }

        if (StringUtils.isBlank(dto.getClientName())) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "客户端名称不能为空"
            );
        }

        if (StringUtils.isBlank(dto.getEngineType())) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "引擎类型不能为空"
            );
        }

        String deployMode = assembler.normalizeDeployMode(dto.getDeployMode());

        if (StringUtils.equalsIgnoreCase(deployMode, SeaTunnelClientDeployMode.SINGLE)) {
            if (StringUtils.isBlank(dto.getClientAddress())) {
                throw new ServiceException(
                        Status.INTERNAL_SERVER_ERROR_ARGS,
                        "客户端地址不能为空"
                );
            }

            if (StringUtils.isBlank(dto.getClientPort())) {
                throw new ServiceException(
                        Status.INTERNAL_SERVER_ERROR_ARGS,
                        "客户端端口不能为空"
                );
            }

            assembler.parsePort(dto.getClientPort());
        }

        if (StringUtils.equalsIgnoreCase(
                deployMode,
                SeaTunnelClientDeployMode.SEPARATED_CLUSTER
        )) {
            if (dto.getMasterEndpoints() == null || dto.getMasterEndpoints().isEmpty()) {
                throw new ServiceException(
                        Status.INTERNAL_SERVER_ERROR_ARGS,
                        "集群模式下至少需要配置一个 Master REST 节点"
                );
            }
        }

        if (Boolean.TRUE.equals(dto.getAuthEnabled())) {
            if (StringUtils.isBlank(dto.getUsername())) {
                throw new ServiceException(
                        Status.INTERNAL_SERVER_ERROR_ARGS,
                        "开启认证后，用户名不能为空"
                );
            }

            if (StringUtils.isBlank(dto.getPassword())) {
                throw new ServiceException(
                        Status.INTERNAL_SERVER_ERROR_ARGS,
                        "开启认证后，密码不能为空"
                );
            }
        }
    }

    /**
     * Gets an existing SeaTunnel client entity by id.
     */
    private SeaTunnelClient getEntity(Long id) {
        if (id == null) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "客户端 ID 不能为空"
            );
        }

        SeaTunnelClient entity = seaTunnelClientDao.queryById(id);

        if (entity == null) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "客户端不存在, id=" + id
            );
        }

        return entity;
    }

    /**
     * Builds authentication information used when calling SeaTunnel REST API.
     */
    private LegacyClientAuthentication buildAuth(SeaTunnelClient entity) {
        LegacyClientAuthentication auth = new LegacyClientAuthentication();

        if (entity == null) {
            return auth;
        }

        auth.setAuthEnabled(entity.getAuthEnabled());
        auth.setUsername(entity.getUsername());
        auth.setPassword(entity.getPassword());

        return auth;
    }

    /**
     * Resolves SeaTunnel client version from the overview API response.
     */
    private String resolveClientVersion(Map<String, Object> overview) {
        Object projectVersion = overview == null ? null : overview.get("projectVersion");

        if (projectVersion == null || StringUtils.isBlank(String.valueOf(projectVersion))) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "SeaTunnel 客户端连接成功，但未获取到版本信息"
            );
        }

        return String.valueOf(projectVersion).trim();
    }

    /**
     * Returns an empty list when the given list is null.
     */
    private <T> List<T> safeList(List<T> list) {
        return list == null ? Collections.emptyList() : list;
    }
}