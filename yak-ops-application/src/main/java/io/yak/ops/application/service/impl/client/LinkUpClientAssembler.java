package io.yak.ops.application.service.impl.client;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import io.yak.ops.common.enums.LinkUpClientDeployMode;
import io.yak.ops.common.enums.LinkUpClientHealthStatusEnum;
import io.yak.ops.common.enums.LinkUpClientNodeRole;
import io.yak.ops.common.utils.CodeGenerateUtils;
import io.yak.ops.application.client.model.LinkUpClientAuthInfo;
import io.yak.ops.application.client.model.LinkUpClientEndpoint;
import io.yak.ops.application.client.model.LinkUpClientSpec;
import io.yak.ops.domain.exceptions.ServiceException;
import io.yak.ops.dao.entity.LinkUpClient;
import io.yak.ops.dao.entity.LinkUpClientNode;
import io.yak.ops.application.model.dto.LinkUpClientDTO;
import io.yak.ops.application.model.dto.LinkUpClientEndpointDTO;
import io.yak.ops.application.model.vo.OptionVO;
import io.yak.ops.plugin.spi.enums.Status;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Assembler for converting LinkUp client objects between API, persistence,
 * and core runtime models.
 *
 * <p>This class keeps object mapping logic in one place, such as converting client
 * requests to runtime specs, converting persisted nodes to endpoints, and building
 * frontend DTOs.</p>
 */
@Component
@Slf4j
public class LinkUpClientAssembler {

    /**
     * Converts a client request DTO to a runtime client specification.
     *
     * <p>The generated spec is used by the core client module to build topology and
     * activate the LinkUp client.</p>
     *
     * @param dto client request DTO
     * @return runtime client specification
     */
    public LinkUpClientSpec toSpec(LinkUpClientDTO dto) {
        String deployMode = normalizeDeployMode(dto.getDeployMode());
        String protocol = normalizeProtocol(dto.getProtocol());

        return LinkUpClientSpec.builder()
                .clientId(dto.getId())
                .clientName(dto.getClientName())
                .engineType(dto.getEngineType())
                .deployMode(deployMode)
                .protocol(protocol)
                .host(dto.getClientAddress())
                .hostname(dto.getClientHostname())
                .port(parsePort(dto.getClientPort()))
                .masterEndpoints(toEndpoints(
                        dto.getMasterEndpoints(),
                        LinkUpClientNodeRole.MASTER,
                        protocol,
                        dto.getContextPath()
                ))
                .workerEndpoints(toEndpoints(
                        dto.getWorkerEndpoints(),
                        LinkUpClientNodeRole.WORKER,
                        protocol,
                        dto.getContextPath()
                ))
                .auth(LinkUpClientAuthInfo.builder()
                        .authEnabled(dto.getAuthEnabled())
                        .username(dto.getUsername())
                        .password(dto.getPassword())
                        .build())
                .contextPath(dto.getContextPath())
                .build();
    }

    /**
     * Converts a persisted client entity and its node records to a runtime client specification.
     *
     * <p>This method is mainly used when refreshing client nodes or rebuilding runtime
     * topology from database state.</p>
     *
     * @param client persisted client entity
     * @param nodes persisted client node list
     * @return runtime client specification
     */
    public LinkUpClientSpec toSpec(
            LinkUpClient client,
            List<LinkUpClientNode> nodes
    ) {
        List<LinkUpClientEndpoint> masters = new ArrayList<>();
        List<LinkUpClientEndpoint> workers = new ArrayList<>();

        if (nodes != null) {
            for (LinkUpClientNode node : nodes) {
                LinkUpClientEndpoint endpoint = toEndpoint(node);

                if (StringUtils.equalsIgnoreCase(
                        node.getNodeRole(),
                        LinkUpClientNodeRole.MASTER
                )) {
                    masters.add(endpoint);
                    continue;
                }

                if (StringUtils.equalsIgnoreCase(
                        node.getNodeRole(),
                        LinkUpClientNodeRole.WORKER
                )) {
                    workers.add(endpoint);
                }
            }
        }

        return LinkUpClientSpec.builder()
                .clientId(client.getId())
                .clientName(client.getClientName())
                .engineType(client.getEngineType())
                .deployMode(normalizeDeployMode(client.getDeployMode()))
                .protocol(normalizeProtocol(client.getProtocol()))
                .host(client.getClientAddress())
                .port(parsePort(client.getClientPort()))
                .masterEndpoints(masters)
                .workerEndpoints(workers)
                .auth(LinkUpClientAuthInfo.builder()
                        .authEnabled(client.getAuthEnabled())
                        .username(client.getUsername())
                        .password(client.getPassword())
                        .build())
                .build();
    }

    /**
     * Converts a persisted client node to a runtime endpoint model.
     *
     * @param node persisted client node
     * @return runtime endpoint model
     */
    public LinkUpClientEndpoint toEndpoint(LinkUpClientNode node) {
        return LinkUpClientEndpoint.builder()
                .id(node.getId())
                .role(node.getNodeRole())
                .host(node.getHost())
                .port(node.getPort())
                .protocol(resolveProtocolFromBaseUrl(node.getBaseUrl()))
                .baseUrl(node.getBaseUrl())
                .activeMaster(Boolean.TRUE.equals(node.getActiveMaster()))
                .healthStatus(resolveHealthStatusName(node.getHealthStatus()))
                .clientVersion(node.getClientVersion())
                .lastError(node.getLastError())
                .build();
    }

    /**
     * Converts a persisted client node to a frontend endpoint DTO.
     *
     * @param node persisted client node
     * @return frontend endpoint DTO
     */
    public LinkUpClientEndpointDTO toEndpointDTO(LinkUpClientNode node) {
        LinkUpClientEndpointDTO dto = new LinkUpClientEndpointDTO();

        dto.setId(node.getId());
        dto.setHost(node.getHost());
        dto.setHostname(node.getHostname());
        dto.setPort(node.getPort());
        dto.setRole(node.getNodeRole());
        dto.setBaseUrl(node.getBaseUrl());
        dto.setActiveMaster(Boolean.TRUE.equals(node.getActiveMaster()));
        dto.setHealthStatus(resolveHealthStatusName(node.getHealthStatus()));
        dto.setLastError(node.getLastError());

        return dto;
    }

    /** Converts a persisted node to the DAO projection attached to a client record. */
    public io.yak.ops.dao.model.result.LinkUpClientEndpoint toPersistenceEndpoint(
            LinkUpClientNode node) {
        io.yak.ops.dao.model.result.LinkUpClientEndpoint endpoint =
                new io.yak.ops.dao.model.result.LinkUpClientEndpoint();
        endpoint.setId(node.getId());
        endpoint.setHost(node.getHost());
        endpoint.setHostname(node.getHostname());
        endpoint.setPort(node.getPort());
        endpoint.setRole(node.getNodeRole());
        endpoint.setBaseUrl(node.getBaseUrl());
        endpoint.setActiveMaster(Boolean.TRUE.equals(node.getActiveMaster()));
        endpoint.setHealthStatus(resolveHealthStatusName(node.getHealthStatus()));
        endpoint.setLastError(node.getLastError());
        return endpoint;
    }

    /**
     * Converts a client entity to an option item.
     *
     * <p>This is mainly used by job configuration pages to select an available
     * LinkUp client.</p>
     *
     * @param entity client entity
     * @return option value object
     */
    public OptionVO toOptionVO(LinkUpClient entity) {
        OptionVO optionVO = new OptionVO();
        optionVO.setValue(entity.getId());
        optionVO.setLabel(entity.getClientName());
        optionVO.setDescription(entity.getClientVersion());
        return optionVO;
    }

    /**
     * Converts a runtime endpoint model to a persisted client node entity.
     *
     * <p>The node is initialized with UNKNOWN health status. The actual status will
     * be updated later according to probe or refresh results.</p>
     *
     * @param clientId client id
     * @param endpoint runtime endpoint model
     * @param now current timestamp
     * @return client node entity
     */
    public LinkUpClientNode toNodeEntity(
            Long clientId,
            LinkUpClientEndpoint endpoint,
            Date now
    ) {
        LinkUpClientNode node = new LinkUpClientNode();

        node.setId(resolveNodeId(endpoint));
        node.setClientId(clientId);
        node.setNodeRole(endpoint.getRole());
        node.setNodeName(endpoint.getHost() + ":" + endpoint.getPort());
        node.setHost(endpoint.getHost());
        node.setHostname(endpoint.getHostname());
        node.setPort(endpoint.getPort());
        node.setBaseUrl(endpoint.getBaseUrl());
        node.setActiveMaster(Boolean.TRUE.equals(endpoint.getActiveMaster()));
        node.setHealthStatus(LinkUpClientHealthStatusEnum.UNKNOWN.getCode());
        node.setClientVersion(endpoint.getClientVersion());
        node.setLastError(endpoint.getLastError());
        node.setCreateTime(now);
        node.setUpdateTime(now);

        return node;
    }

    /**
     * Normalizes client deploy mode.
     *
     * <p>Unsupported or empty deploy mode will be treated as SINGLE mode by default.</p>
     *
     * @param deployMode raw deploy mode
     * @return normalized deploy mode
     */
    public String normalizeDeployMode(String deployMode) {
        if (StringUtils.equalsIgnoreCase(
                deployMode,
                LinkUpClientDeployMode.SEPARATED_CLUSTER
        )) {
            return LinkUpClientDeployMode.SEPARATED_CLUSTER;
        }

        return LinkUpClientDeployMode.SINGLE;
    }

    /**
     * Normalizes client protocol.
     *
     * <p>Only HTTPS is preserved explicitly. Other values will be treated as HTTP.</p>
     *
     * @param protocol raw protocol
     * @return normalized protocol
     */
    public String normalizeProtocol(String protocol) {
        if (StringUtils.equalsIgnoreCase(protocol, "https")) {
            return "https";
        }

        return "http";
    }

    /**
     * Parses and validates client port.
     *
     * @param port raw port string
     * @return parsed port, or null when input is blank
     */
    public Integer parsePort(String port) {
        if (StringUtils.isBlank(port)) {
            return null;
        }

        try {
            int value = Integer.parseInt(port.trim());

            if (value <= 0 || value > 65535) {
                throw new IllegalArgumentException("port out of range");
            }

            return value;
        } catch (Exception e) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "端口不合法，必须是 1 到 65535 之间的数字"
            );
        }
    }

    /**
     * Resolves health status name from stored status code.
     *
     * @param code stored health status code
     * @return health status name
     */
    public String resolveHealthStatusName(Integer code) {
        if (code == null) {
            return "UNKNOWN";
        }

        if (Objects.equals(code, LinkUpClientHealthStatusEnum.LIVE.getCode())) {
            return "LIVE";
        }

        if (Objects.equals(code, LinkUpClientHealthStatusEnum.DEAD.getCode())) {
            return "DEAD";
        }

        return "UNKNOWN";
    }

    /**
     * Converts endpoint DTOs to runtime endpoint models.
     *
     * <p>Duplicated endpoints are removed by host and port to avoid probing the same
     * REST endpoint repeatedly.</p>
     *
     * @param endpointDTOList endpoint DTO list
     * @param role node role
     * @param protocol normalized protocol
     * @return runtime endpoint list
     */
    private List<LinkUpClientEndpoint> toEndpoints(
            List<LinkUpClientEndpointDTO> endpointDTOList,
            String role,
            String protocol,
            String contextPath
    ) {
        if (endpointDTOList == null || endpointDTOList.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        Map<String, LinkUpClientEndpoint> endpointMap = new LinkedHashMap<>();

        for (LinkUpClientEndpointDTO dto : endpointDTOList) {
            if (dto == null || StringUtils.isBlank(dto.getHost())) {
                continue;
            }

            Integer port = dto.getPort();
            String host = dto.getHost().trim();
            String hostname = dto.getHostname();

            LinkUpClientEndpoint endpoint = LinkUpClientEndpoint.builder()
                    .id(dto.getId())
                    .role(role)
                    .host(host)
                    .hostname(hostname)
                    .port(port)
                    .protocol(protocol)
                    .baseUrl(buildBaseUrl(protocol, host, port))
                    .contextPath(contextPath)
                    .activeMaster(Boolean.TRUE.equals(dto.getActiveMaster()))
                    .healthStatus(dto.getHealthStatus())
                    .lastError(dto.getLastError())
                    .build();

            endpointMap.putIfAbsent(host + ":" + port, endpoint);
        }

        return new ArrayList<>(endpointMap.values());
    }

    /**
     * Builds endpoint base URL from protocol, host, and port.
     *
     * @param protocol endpoint protocol
     * @param host endpoint host
     * @param port endpoint port
     * @return endpoint base URL
     */
    private String buildBaseUrl(
            String protocol,
            String host,
            Integer port
    ) {
        if (StringUtils.isBlank(host) || port == null) {
            return null;
        }

        return normalizeProtocol(protocol) + "://" + host.trim() + ":" + port;
    }

    /**
     * Resolves protocol from endpoint base URL.
     *
     * @param baseUrl endpoint base URL
     * @return protocol name
     */
    private String resolveProtocolFromBaseUrl(String baseUrl) {
        if (StringUtils.startsWithIgnoreCase(baseUrl, "https://")) {
            return "https";
        }

        return "http";
    }

    /**
     * Resolves node id for persistence.
     *
     * <p>If the endpoint already has an id, the existing id will be reused. Otherwise,
     * a new id will be generated for the node entity.</p>
     *
     * @param endpoint runtime endpoint model
     * @return node id
     */
    private Long resolveNodeId(LinkUpClientEndpoint endpoint) {
        if (endpoint != null && endpoint.getId() != null) {
            return endpoint.getId();
        }

        return CodeGenerateUtils.getInstance().genCode();
    }
}
