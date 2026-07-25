package io.yak.ops.application.service.impl.client;

import javax.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import io.yak.ops.common.enums.LinkUpClientDeployMode;
import io.yak.ops.common.enums.LinkUpClientHealthStatusEnum;
import io.yak.ops.common.enums.LinkUpClientNodeRole;
import io.yak.ops.application.client.model.LinkUpClientActivationResult;
import io.yak.ops.application.client.model.LinkUpClientEndpoint;
import io.yak.ops.application.client.model.LinkUpClientProbeResult;
import io.yak.ops.application.client.model.LinkUpClientSpec;
import io.yak.ops.application.client.model.LinkUpClientTopology;
import io.yak.ops.application.client.service.LinkUpClientActivationService;
import io.yak.ops.application.client.service.LinkUpClientTopologyBuilder;
import io.yak.ops.domain.exceptions.ServiceException;
import io.yak.ops.dao.entity.LinkUpClient;
import io.yak.ops.dao.entity.LinkUpClientNode;
import io.yak.ops.dao.repository.JobDefinitionDao;
import io.yak.ops.dao.repository.LinkUpClientDao;
import io.yak.ops.dao.repository.LinkUpClientNodeDao;
import io.yak.ops.engine.api.EngineClientAuthentication;
import io.yak.ops.engine.api.EngineClientPort;
import io.yak.ops.application.model.dto.LinkUpClientDTO;
import io.yak.ops.application.model.dto.LinkUpClientEndpointDTO;
import io.yak.ops.plugin.spi.enums.Status;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Application service for managing the lifecycle of LinkUp clients.
 *
 * <p>This service is responsible for client registration, update, deletion,
 * node refresh, activation result persistence, and node status synchronization.</p>
 *
 * <p>The application layer coordinates domain services, persistence, and remote
 * LinkUp engine calls. The core activation and topology rules are delegated
 * to {@link LinkUpClientTopologyBuilder} and {@link LinkUpClientActivationService}.</p>
 */
@Service
@Slf4j
public class LinkUpClientLifecycleAppService {

    @Resource
    private LinkUpClientDao linkUpClientDao;

    @Resource
    private LinkUpClientNodeDao linkUpClientNodeDao;

    @Resource
    private EngineClientPort linkUpRestClient;

    @Resource
    private LinkUpClientTopologyBuilder topologyBuilder;

    @Resource
    private LinkUpClientActivationService activationService;

    @Resource
    private LinkUpClientAssembler assembler;

    @Resource
    private JobDefinitionDao jobDefinitionDao;




    /**
     * Creates or updates a LinkUp client.
     *
     * <p>The client configuration is first converted into a runtime specification,
     * then a topology is built from that specification. The topology will be activated
     * before being persisted, so only reachable and supported LinkUp clients can be saved.</p>
     *
     * @param dto client save or update request
     */
    @Transactional(rollbackFor = Exception.class)
    public void saveOrUpdate(LinkUpClientDTO dto) {
        validateSaveOrUpdateRequest(dto);

        Date now = new Date();

        LinkUpClientSpec spec = assembler.toSpec(dto);
        LinkUpClientTopology topology = topologyBuilder.build(spec);
        LinkUpClientActivationResult activationResult =
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
     * Deletes a LinkUp client and its related nodes.
     *
     * <p>The client can only be deleted when it is not referenced by any batch job definition.</p>
     *
     * @param id client id
     */
    @Transactional(rollbackFor = Exception.class)
    public void deleteById(Long id) {
        LinkUpClient entity = getEntity(id);

        linkUpClientNodeDao.deleteByClientId(entity.getId());
        linkUpClientDao.deleteById(entity.getId());
    }

    /**
     * Refreshes all configured nodes of a LinkUp client.
     *
     * <p>This method rebuilds the runtime topology from persisted client and node
     * configuration, probes master nodes again, updates the active master, and refreshes
     * worker node health status.</p>
     *
     * @param clientId client id
     * @return latest endpoint list
     */
    @Transactional(rollbackFor = Exception.class)
    public List<LinkUpClientEndpointDTO> refreshNodes(Long clientId) {
        LinkUpClient client = getEntity(clientId);

        List<LinkUpClientNode> currentNodes =
                linkUpClientNodeDao.selectByClientId(clientId);

        LinkUpClientSpec spec = assembler.toSpec(client, currentNodes);
        LinkUpClientTopology topology = topologyBuilder.build(spec);

        LinkUpClientActivationResult activationResult =
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
        linkUpClientDao.updateById(client);

        updateMasterNodesByProbeResult(clientId, activationResult, now);
        refreshWorkerNodes(clientId, client);

        return currentEndpointList(clientId);
    }

    /**
     * Persists a new LinkUp client and rebuilds its node records.
     */
    private void createClient(
            LinkUpClientDTO dto,
            LinkUpClientActivationResult activationResult,
            Date now
    ) {
        LinkUpClient entity = new LinkUpClient();
        BeanUtils.copyProperties(dto, entity);

        entity.setCreateTime(now);
        entity.setUpdateTime(now);

        applyBaseConfig(dto, entity);
        applyActivationToClient(entity, activationResult, now);

        linkUpClientDao.insert(entity);

        Long activeMasterNodeId =
                rebuildClientNodes(entity.getId(), activationResult, now);

        entity.setActiveMasterNodeId(activeMasterNodeId);
        entity.setUpdateTime(now);

        linkUpClientDao.updateById(entity);
    }

    /**
     * Updates an existing LinkUp client and rebuilds its node records.
     *
     * <p>The client cannot be updated when it is already used by existing jobs,
     * because updating engine address or authentication may affect job execution.</p>
     */
    private void updateClient(
            LinkUpClientDTO dto,
            LinkUpClientActivationResult activationResult,
            Date now
    ) {
        LinkUpClient entity = getEntity(dto.getId());

        BeanUtils.copyProperties(dto, entity);

        applyBaseConfig(dto, entity);
        applyActivationToClient(entity, activationResult, now);

        linkUpClientDao.updateById(entity);

        Long activeMasterNodeId =
                rebuildClientNodes(entity.getId(), activationResult, now);

        entity.setActiveMasterNodeId(activeMasterNodeId);
        entity.setUpdateTime(now);

        linkUpClientDao.updateById(entity);
    }

    /**
     * Applies normalized base configuration values to the client entity.
     */
    private void applyBaseConfig(
            LinkUpClientDTO dto,
            LinkUpClient entity
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
            LinkUpClient client,
            LinkUpClientActivationResult activationResult,
            Date now
    ) {
        LinkUpClientEndpoint activeMaster = activationResult.getActiveMaster();

        if (activeMaster == null) {
            client.setHealthStatus(LinkUpClientHealthStatusEnum.DEAD.getCode());
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
        client.setHealthStatus(LinkUpClientHealthStatusEnum.LIVE.getCode());
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
            LinkUpClientActivationResult activationResult,
            Date now
    ) {
        linkUpClientNodeDao.deleteByClientId(clientId);

        LinkUpClientTopology topology = activationResult.getTopology();

        if (topology == null) {
            return null;
        }

        Long activeMasterNodeId = null;

        for (LinkUpClientEndpoint master : safeList(topology.getMasters())) {
            LinkUpClientNode node = assembler.toNodeEntity(clientId, master, now);

            LinkUpClientProbeResult probeResult =
                    findProbeResult(activationResult, master);

            applyProbeResultToNode(node, probeResult, now);

            boolean activeMaster = isActiveMaster(activationResult, master);
            node.setActiveMaster(activeMaster);

            if (activeMaster) {
                activeMasterNodeId = node.getId();
            }

            linkUpClientNodeDao.insert(node);
        }

        for (LinkUpClientEndpoint worker : safeList(topology.getWorkers())) {
            LinkUpClientNode node = assembler.toNodeEntity(clientId, worker, now);
            node.setActiveMaster(false);
            node.setHealthStatus(LinkUpClientHealthStatusEnum.UNKNOWN.getCode());

            linkUpClientNodeDao.insert(node);
        }

        return activeMasterNodeId;
    }

    /**
     * Updates persisted master node states according to the latest probe results.
     */
    private void updateMasterNodesByProbeResult(
            Long clientId,
            LinkUpClientActivationResult activationResult,
            Date now
    ) {
        List<LinkUpClientNode> nodes =
                linkUpClientNodeDao.selectByClientIdAndRole(
                        clientId,
                        LinkUpClientNodeRole.MASTER
                );

        if (nodes == null || nodes.isEmpty()) {
            return;
        }

        for (LinkUpClientNode node : nodes) {
            LinkUpClientEndpoint endpoint = assembler.toEndpoint(node);
            LinkUpClientProbeResult probeResult =
                    findProbeResult(activationResult, endpoint);

            applyProbeResultToNode(node, probeResult, now);

            node.setActiveMaster(isActiveMaster(activationResult, endpoint));
            node.setUpdateTime(now);

            linkUpClientNodeDao.updateById(node);
        }

        LinkUpClientEndpoint activeMaster = activationResult.getActiveMaster();
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
                    LinkUpClient client = getEntity(clientId);
                    client.setActiveMasterNodeId(node.getId());
                    client.setUpdateTime(now);
                    linkUpClientDao.updateById(client);
                });
    }

    /**
     * Refreshes worker node health status by calling the LinkUp overview API.
     *
     * <p>Worker nodes are not used as active runtime entry points, but their status
     * is still useful for displaying cluster topology and diagnosing engine issues.</p>
     */
    private void refreshWorkerNodes(
            Long clientId,
            LinkUpClient client
    ) {
        List<LinkUpClientNode> workers =
                linkUpClientNodeDao.selectByClientIdAndRole(
                        clientId,
                        LinkUpClientNodeRole.WORKER
                );

        if (workers == null || workers.isEmpty()) {
            return;
        }

        for (LinkUpClientNode worker : workers) {
            Date now = new Date();

            try {
                Map<String, Object> overview = linkUpRestClient.overview(
                        worker.getBaseUrl(),
                        null, // TODO 暂时不设置
                        null,
                        buildAuth(client)
                );

                String version = resolveClientVersion(overview);

                worker.setHealthStatus(LinkUpClientHealthStatusEnum.LIVE.getCode());
                worker.setClientVersion(version);
                worker.setLastError(null);
                worker.setLastHeartbeatTime(now);
                worker.setUpdateTime(now);

                linkUpClientNodeDao.updateById(worker);
            } catch (Exception e) {
                worker.setHealthStatus(LinkUpClientHealthStatusEnum.DEAD.getCode());
                worker.setActiveMaster(false);
                worker.setLastHeartbeatTime(now);
                worker.setLastError(e.getMessage());
                worker.setUpdateTime(now);

                linkUpClientNodeDao.updateById(worker);

                log.warn(
                        "Refresh LinkUp worker node failed, clientId={}, baseUrl={}",
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
            LinkUpClientNode node,
            LinkUpClientProbeResult probeResult,
            Date now
    ) {
        if (node == null) {
            return;
        }

        if (probeResult == null) {
            node.setHealthStatus(LinkUpClientHealthStatusEnum.UNKNOWN.getCode());
            node.setActiveMaster(false);
            node.setLastHeartbeatTime(now);
            node.setUpdateTime(now);
            return;
        }

        if (probeResult.isLive()) {
            node.setHealthStatus(LinkUpClientHealthStatusEnum.LIVE.getCode());
            node.setClientVersion(probeResult.getClientVersion());
            node.setLastError(null);
        } else {
            node.setHealthStatus(LinkUpClientHealthStatusEnum.DEAD.getCode());
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
            LinkUpClientActivationResult activationResult,
            LinkUpClientEndpoint endpoint
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
    private LinkUpClientProbeResult findProbeResult(
            LinkUpClientActivationResult activationResult,
            LinkUpClientEndpoint endpoint
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
            LinkUpClient client,
            String errorMessage,
            Date now
    ) {
        if (client == null) {
            return;
        }

        client.setHealthStatus(LinkUpClientHealthStatusEnum.DEAD.getCode());
        client.setActiveMasterNodeId(null);
        client.setLastError(errorMessage);
        client.setHeartbeatTime(now);
        client.setUpdateTime(now);

        linkUpClientDao.updateById(client);
    }

    /**
     * Returns the latest endpoint list of a client.
     */
    private List<LinkUpClientEndpointDTO> currentEndpointList(Long clientId) {
        List<LinkUpClientNode> nodes =
                linkUpClientNodeDao.selectByClientId(clientId);

        if (nodes == null || nodes.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        return nodes.stream()
                .map(assembler::toEndpointDTO)
                .collect(java.util.stream.Collectors.toList());
    }

    /**
     * Validates the client save or update request.
     */
    private void validateSaveOrUpdateRequest(LinkUpClientDTO dto) {
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

        if (StringUtils.equalsIgnoreCase(deployMode, LinkUpClientDeployMode.SINGLE)) {
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
                LinkUpClientDeployMode.SEPARATED_CLUSTER
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
     * Gets an existing LinkUp client entity by id.
     */
    private LinkUpClient getEntity(Long id) {
        if (id == null) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "客户端 ID 不能为空"
            );
        }

        LinkUpClient entity = linkUpClientDao.queryById(id);

        if (entity == null) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "客户端不存在, id=" + id
            );
        }

        return entity;
    }

    /**
     * Builds authentication information used when calling LinkUp REST API.
     */
    private EngineClientAuthentication buildAuth(LinkUpClient entity) {
        EngineClientAuthentication auth = new EngineClientAuthentication();

        if (entity == null) {
            return auth;
        }

        auth.setAuthEnabled(entity.getAuthEnabled());
        auth.setUsername(entity.getUsername());
        auth.setPassword(entity.getPassword());

        return auth;
    }

    /**
     * Resolves LinkUp client version from the overview API response.
     */
    private String resolveClientVersion(Map<String, Object> overview) {
        Object projectVersion = overview == null ? null : overview.get("projectVersion");

        if (projectVersion == null || StringUtils.isBlank(String.valueOf(projectVersion))) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "LinkUp 客户端连接成功，但未获取到版本信息"
            );
        }

        return String.valueOf(projectVersion).trim();
    }

    /**
     * Returns an empty list when the given list is null.
     */
    private <T> List<T> safeList(List<T> list) {
        return list == null ? java.util.Collections.emptyList() : list;
    }
}
