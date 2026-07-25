package io.yak.ops.application.client.model;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Activation result of a SeaTunnel client.
 *
 * <p>This model represents the result of activating a SeaTunnel client topology.
 * It contains the selected active master, resolved client version, probe results,
 * topology information, and failure reason when activation fails.</p>
 */
@Data
@Builder
public class SeaTunnelClientActivationResult {

    /**
     * Whether the client is successfully activated.
     */
    private boolean live;

    /**
     * Overall health status of the client.
     *
     * <p>Typical values are LIVE and DEAD.</p>
     */
    private String clientHealthStatus;

    /**
     * SeaTunnel client version resolved from the active master.
     *
     * <p>This value is available only when activation succeeds.</p>
     */
    private String clientVersion;

    /**
     * Base URL of the selected active master.
     *
     * <p>This URL is used as the runtime entry point for later SeaTunnel REST calls.</p>
     */
    private String activeBaseUrl;

    /**
     * Selected active master endpoint.
     *
     * <p>When multiple masters are configured, the activation service selects one
     * reachable and supported master as the active runtime entry point.</p>
     */
    private SeaTunnelClientEndpoint activeMaster;

    /**
     * Client topology used during activation.
     *
     * <p>The topology contains normalized master and worker endpoints.</p>
     */
    private SeaTunnelClientTopology topology;

    /**
     * Probe results of all probed master endpoints.
     *
     * <p>These results can be persisted or returned for diagnostics when activation
     * fails or when some nodes are unavailable.</p>
     */
    private List<SeaTunnelClientProbeResult> probeResults;

    /**
     * Error message returned when activation fails.
     */
    private String errorMessage;

    /**
     * Creates a successful activation result.
     *
     * @param topology client topology used during activation
     * @param probeResults probe results of master endpoints
     * @param activeMaster selected active master endpoint
     * @param version SeaTunnel client version resolved from the active master
     * @return successful activation result
     */
    public static SeaTunnelClientActivationResult live(
            SeaTunnelClientTopology topology,
            List<SeaTunnelClientProbeResult> probeResults,
            SeaTunnelClientEndpoint activeMaster,
            String version
    ) {
        return SeaTunnelClientActivationResult.builder()
                .live(true)
                .clientHealthStatus("LIVE")
                .clientVersion(version)
                .activeBaseUrl(activeMaster.getBaseUrl())
                .activeMaster(activeMaster)
                .topology(topology)
                .probeResults(probeResults)
                .build();
    }

    /**
     * Creates a failed activation result.
     *
     * @param topology client topology used during activation
     * @param probeResults probe results of master endpoints
     * @param errorMessage activation failure reason
     * @return failed activation result
     */
    public static SeaTunnelClientActivationResult dead(
            SeaTunnelClientTopology topology,
            List<SeaTunnelClientProbeResult> probeResults,
            String errorMessage
    ) {
        return SeaTunnelClientActivationResult.builder()
                .live(false)
                .clientHealthStatus("DEAD")
                .topology(topology)
                .probeResults(probeResults)
                .errorMessage(errorMessage)
                .build();
    }
}
