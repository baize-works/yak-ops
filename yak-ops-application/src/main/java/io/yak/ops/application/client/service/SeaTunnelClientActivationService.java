package io.yak.ops.application.client.service;

import org.apache.commons.lang3.StringUtils;
import io.yak.ops.common.enums.SeaTunnelClientDeployMode;
import io.yak.ops.application.client.model.*;
import io.yak.ops.application.client.policy.SeaTunnelClientVersionPolicy;
import io.yak.ops.application.client.port.SeaTunnelClientProbeGateway;
import io.yak.ops.domain.exceptions.ServiceException;
import io.yak.ops.plugin.spi.enums.Status;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Domain service used to activate a SeaTunnel client topology.
 */
@Component
public class SeaTunnelClientActivationService {

    private final SeaTunnelClientProbeGateway probeGateway;

    private final SeaTunnelClientVersionPolicy versionPolicy;

    public SeaTunnelClientActivationService(
            SeaTunnelClientProbeGateway probeGateway,
            SeaTunnelClientVersionPolicy versionPolicy
    ) {
        this.probeGateway = probeGateway;
        this.versionPolicy = versionPolicy;
    }

    public SeaTunnelClientActivationResult activate(
            SeaTunnelClientSpec spec,
            SeaTunnelClientTopology topology
    ) {
        if (topology == null || !topology.hasMaster()) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "至少需要配置一个 Master REST 节点"
            );
        }

        List<SeaTunnelClientProbeResult> probeResults = new ArrayList<>();

        SeaTunnelClientEndpoint firstLiveMaster = null;
        SeaTunnelClientEndpoint reportedActiveMaster = null;

        for (SeaTunnelClientEndpoint master : topology.getMasters()) {
            SeaTunnelClientProbeResult result =
                    probeGateway.probe(master, spec == null ? null : spec.getAuth());

            probeResults.add(result);

            if (result == null || !result.isLive()) {
                continue;
            }

            SeaTunnelClientEndpoint endpoint = result.getEndpoint();

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

        SeaTunnelClientEndpoint activeMaster = resolveActiveMaster(
                spec,
                firstLiveMaster,
                reportedActiveMaster
        );

        if (activeMaster == null) {
            return SeaTunnelClientActivationResult.dead(
                    topology,
                    probeResults,
                    buildNoActiveMasterMessage(spec)
            );
        }

        activeMaster.setActiveMaster(true);

        return SeaTunnelClientActivationResult.live(
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
     * <p>For SEPARATED_CLUSTER mode, prefer the master reported by SeaTunnel engine.</p>
     */
    private SeaTunnelClientEndpoint resolveActiveMaster(
            SeaTunnelClientSpec spec,
            SeaTunnelClientEndpoint firstLiveMaster,
            SeaTunnelClientEndpoint reportedActiveMaster
    ) {
        if (isSingleMode(spec)) {
            return firstLiveMaster;
        }

        return reportedActiveMaster;
    }

    private boolean isSingleMode(SeaTunnelClientSpec spec) {
        return spec != null
                && StringUtils.equalsIgnoreCase(
                spec.getDeployMode(),
                SeaTunnelClientDeployMode.SINGLE
        );
    }

    private String buildNoActiveMasterMessage(SeaTunnelClientSpec spec) {
        if (isSingleMode(spec)) {
            return "SeaTunnel REST 节点连接失败，请检查地址、端口、账号密码或 Zeta 引擎是否已启动";
        }

        return "所有 Master REST 节点均未识别到 active master，请检查地址、端口、账号密码、Zeta 引擎状态或 hostname 配置";
    }
}
