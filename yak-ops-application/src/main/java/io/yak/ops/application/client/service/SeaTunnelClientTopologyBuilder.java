package io.yak.ops.application.client.service;

import org.apache.commons.lang3.StringUtils;
import io.yak.ops.common.enums.SeaTunnelClientDeployMode;
import io.yak.ops.common.enums.SeaTunnelClientNodeRole;
import io.yak.ops.application.client.model.SeaTunnelClientEndpoint;
import io.yak.ops.application.client.model.SeaTunnelClientSpec;
import io.yak.ops.application.client.model.SeaTunnelClientTopology;
import io.yak.ops.domain.exceptions.ServiceException;
import io.yak.ops.plugin.spi.enums.Status;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Domain service used to build a normalized SeaTunnel client topology.
 *
 * <p>This service converts a client specification into a runtime topology that can
 * be used for client activation, node probing, and runtime routing.</p>
 *
 * <p>It supports both SINGLE mode and SEPARATED_CLUSTER mode. In SINGLE mode, the
 * configured host and port are treated as one master endpoint. In cluster mode,
 * master and worker endpoints are normalized separately.</p>
 */
@Component
public class SeaTunnelClientTopologyBuilder {

    /**
     * Builds a normalized SeaTunnel client topology from the given client specification.
     *
     * @param spec client runtime specification
     * @return normalized client topology
     */
    public SeaTunnelClientTopology build(SeaTunnelClientSpec spec) {
        validateBasicSpec(spec);

        String deployMode = normalizeDeployMode(spec.getDeployMode());
        String protocol = normalizeProtocol(spec.getProtocol());

        if (SeaTunnelClientDeployMode.SINGLE.equalsIgnoreCase(deployMode)) {
            SeaTunnelClientEndpoint master = buildEndpoint(
                    SeaTunnelClientNodeRole.MASTER,
                    spec.getHost(),
                    spec.getHostname(),
                    spec.getPort(),
                    protocol,
                    spec.getContextPath()
            );

            return SeaTunnelClientTopology.builder()
                    .deployMode(SeaTunnelClientDeployMode.SINGLE)
                    .masters(Collections.singletonList(master))
                    .workers(java.util.Collections.emptyList())
                    .build();
        }

        List<SeaTunnelClientEndpoint> masters =
                normalizeEndpoints(SeaTunnelClientNodeRole.MASTER, spec.getMasterEndpoints(), protocol, spec.getContextPath());

        List<SeaTunnelClientEndpoint> workers =
                normalizeEndpoints(SeaTunnelClientNodeRole.WORKER, spec.getWorkerEndpoints(), protocol, spec.getContextPath());

        if (masters.isEmpty()) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "至少需要配置一个 Master REST 节点"
            );
        }

        return SeaTunnelClientTopology.builder()
                .deployMode(SeaTunnelClientDeployMode.SEPARATED_CLUSTER)
                .masters(masters)
                .workers(workers)
                .build();
    }

    /**
     * Validates required basic fields of the client specification.
     */
    private void validateBasicSpec(SeaTunnelClientSpec spec) {
        if (spec == null) {
            throw new ServiceException(Status.INTERNAL_SERVER_ERROR_ARGS, "客户端参数不能为空");
        }

        if (StringUtils.isBlank(spec.getClientName())) {
            throw new ServiceException(Status.INTERNAL_SERVER_ERROR_ARGS, "客户端名称不能为空");
        }

        if (StringUtils.isBlank(spec.getEngineType())) {
            throw new ServiceException(Status.INTERNAL_SERVER_ERROR_ARGS, "引擎类型不能为空");
        }
    }

    /**
     * Normalizes endpoint list by role and protocol.
     *
     * <p>Invalid empty endpoints are ignored. Duplicated endpoints are removed by
     * host and port to avoid probing or persisting the same endpoint repeatedly.</p>
     *
     * @param role endpoint role, such as MASTER or WORKER
     * @param endpoints raw endpoint list
     * @param protocol normalized protocol
     * @return normalized endpoint list
     */
    private List<SeaTunnelClientEndpoint> normalizeEndpoints(
            String role,
            List<SeaTunnelClientEndpoint> endpoints,
            String protocol,
            String contextPath
    ) {
        if (endpoints == null || endpoints.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        Map<String, SeaTunnelClientEndpoint> endpointMap = new LinkedHashMap<>();

        for (SeaTunnelClientEndpoint endpoint : endpoints) {
            if (endpoint == null || StringUtils.isBlank(endpoint.getHost())) {
                continue;
            }

            validatePort(endpoint.getPort());

            SeaTunnelClientEndpoint normalized = buildEndpoint(
                    role,
                    endpoint.getHost(),
                    endpoint.getHostname(),
                    endpoint.getPort(),
                    protocol,
                    contextPath
            );

            normalized.setId(endpoint.getId());
            normalized.setActiveMaster(Boolean.TRUE.equals(endpoint.getActiveMaster()));
            normalized.setHealthStatus(endpoint.getHealthStatus());
            normalized.setClientVersion(endpoint.getClientVersion());
            normalized.setLastError(endpoint.getLastError());

            String key = normalized.getHost() + ":" + normalized.getPort();
            endpointMap.putIfAbsent(key, normalized);
        }

        return new ArrayList<>(endpointMap.values());
    }

    /**
     * Builds a normalized endpoint model.
     *
     * <p>The endpoint base URL is generated from protocol, host, and port. The initial
     * health status is UNKNOWN because the actual status should be resolved by probing.</p>
     */
    private SeaTunnelClientEndpoint buildEndpoint(
            String role,
            String host,
            String hostname,
            Integer port,
            String protocol,
            String contextPath
    ) {
        if (StringUtils.isBlank(host)) {
            throw new ServiceException(Status.INTERNAL_SERVER_ERROR_ARGS, "客户端地址不能为空");
        }

        validatePort(port);

        String normalizedHost = host.trim();

        return SeaTunnelClientEndpoint.builder()
                .role(role)
                .host(normalizedHost)
                .hostname(hostname)
                .port(port)
                .protocol(protocol)
                .baseUrl(buildBaseUrl(protocol, normalizedHost, port))
                .contextPath(contextPath)
                .activeMaster(false)
                .healthStatus("UNKNOWN")
                .build();
    }

    /**
     * Validates endpoint port.
     *
     * @param port endpoint port
     */
    private void validatePort(Integer port) {
        if (port == null || port <= 0 || port > 65535) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "端口不合法，必须是 1 到 65535 之间的数字"
            );
        }
    }

    /**
     * Normalizes deploy mode.
     *
     * <p>Only SEPARATED_CLUSTER is preserved explicitly. Other values will be treated
     * as SINGLE mode by default.</p>
     *
     * @param deployMode raw deploy mode
     * @return normalized deploy mode
     */
    private String normalizeDeployMode(String deployMode) {
        if (SeaTunnelClientDeployMode.SEPARATED_CLUSTER.equalsIgnoreCase(deployMode)) {
            return SeaTunnelClientDeployMode.SEPARATED_CLUSTER;
        }

        return SeaTunnelClientDeployMode.SINGLE;
    }

    /**
     * Normalizes endpoint protocol.
     *
     * <p>Only HTTPS is preserved explicitly. Other values will be treated as HTTP.</p>
     *
     * @param protocol raw protocol
     * @return normalized protocol
     */
    private String normalizeProtocol(String protocol) {
        if ("https".equalsIgnoreCase(protocol)) {
            return "https";
        }

        return "http";
    }

    /**
     * Builds endpoint base URL.
     *
     * @param protocol endpoint protocol
     * @param host endpoint host
     * @param port endpoint port
     * @return endpoint base URL
     */
    private String buildBaseUrl(String protocol, String host, Integer port) {
        return protocol + "://" + host + ":" + port;
    }
}
