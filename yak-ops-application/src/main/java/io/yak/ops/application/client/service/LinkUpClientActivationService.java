package io.yak.ops.application.client.service;

import org.apache.commons.lang3.StringUtils;
import io.yak.ops.common.enums.LinkUpClientDeployMode;
import io.yak.ops.application.client.model.*;
import io.yak.ops.application.client.policy.LinkUpClientVersionPolicy;
import io.yak.ops.application.client.port.LinkUpClientProbeGateway;
import io.yak.ops.domain.exceptions.ServiceException;
import io.yak.ops.plugin.spi.enums.Status;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Domain service used to activate a LinkUp client topology.
 */
@Component
public class LinkUpClientActivationService {

    private final LinkUpClientProbeGateway probeGateway;

    private final LinkUpClientVersionPolicy versionPolicy;

    public LinkUpClientActivationService(
            LinkUpClientProbeGateway probeGateway,
            LinkUpClientVersionPolicy versionPolicy
    ) {
        this.probeGateway = probeGateway;
        this.versionPolicy = versionPolicy;
    }

    public LinkUpClientActivationResult activate(
            LinkUpClientSpec spec,
            LinkUpClientTopology topology
    ) {
        if (topology == null || !topology.hasMaster()) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "至少需要配置一个 Master REST 节点"
            );
        }

        List<LinkUpClientProbeResult> probeResults = new ArrayList<>();

        LinkUpClientEndpoint firstLiveMaster = null;
        LinkUpClientEndpoint reportedActiveMaster = null;

        for (LinkUpClientEndpoint master : topology.getMasters()) {
            LinkUpClientProbeResult result =
                    probeGateway.probe(master, spec == null ? null : spec.getAuth());

            probeResults.add(result);

            if (result == null || !result.isLive()) {
                continue;
            }

            LinkUpClientEndpoint endpoint = result.getEndpoint();

            if (endpoint == null) {
                continue;
            }

            versionPolicy.check(result.getClientVersion());

            if (firstLiveMaster == null) {
                firstLiveMaster = endpoint;
            }

            if (Boolean.TRUE.equals(endpoint.getActiveMaster())) {
                reportedActiveMaster = endpoint;
            }
        }

        LinkUpClientEndpoint activeMaster = resolveActiveMaster(
                spec,
                firstLiveMaster,
                reportedActiveMaster
        );

        if (activeMaster == null) {
            return LinkUpClientActivationResult.dead(
                    topology,
                    probeResults,
                    buildNoActiveMasterMessage(spec)
            );
        }

        activeMaster.setActiveMaster(true);

        return LinkUpClientActivationResult.live(
                topology,
                probeResults,
                activeMaster,
                activeMaster.getClientVersion()
        );
    }

    /**
     * Resolves the active runtime entrypoint according to deploy mode.
     *
     * <p>For SINGLE mode, a reachable REST endpoint is enough, because there is only
     * one runtime entrypoint from Yak Ops's perspective.</p>
     *
     * <p>For SEPARATED_CLUSTER mode, prefer the master reported by LinkUp engine.</p>
     */
    private LinkUpClientEndpoint resolveActiveMaster(
            LinkUpClientSpec spec,
            LinkUpClientEndpoint firstLiveMaster,
            LinkUpClientEndpoint reportedActiveMaster
    ) {
        if (isSingleMode(spec)) {
            return firstLiveMaster;
        }

        return reportedActiveMaster;
    }

    private boolean isSingleMode(LinkUpClientSpec spec) {
        return spec != null
                && StringUtils.equalsIgnoreCase(
                spec.getDeployMode(),
                LinkUpClientDeployMode.SINGLE
        );
    }

    private String buildNoActiveMasterMessage(LinkUpClientSpec spec) {
        if (isSingleMode(spec)) {
            return "LinkUp REST 节点连接失败，请检查地址、端口、账号密码或 Zeta 引擎是否已启动";
        }

        return "所有 Master REST 节点均未识别到 active master，请检查地址、端口、账号密码、Zeta 引擎状态或 hostname 配置";
    }
}
