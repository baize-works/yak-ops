package io.yak.ops.application.client.model;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Activation result of a LinkUp client.
 *
 * <p>This model represents the result of activating a LinkUp client topology.
 * It contains the selected active master, resolved client version, probe results,
 * topology information, and failure reason when activation fails.</p>
 */
@Data
@Builder
public class LinkUpClientActivationResult {

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
     * LinkUp client version resolved from the active master.
     *
     * <p>This value is available only when activation succeeds.</p>
     */
    private String clientVersion;

    /**
     * Base URL of the selected active master.
     *
     * <p>This URL is used as the runtime entry point for later LinkUp REST calls.</p>
     */
    private String activeBaseUrl;

    /**
     * Selected active master endpoint.
     *
     * <p>When multiple masters are configured, the activation service selects one
     * reachable and supported master as the active runtime entry point.</p>
     */
    private LinkUpClientEndpoint activeMaster;

    /**
     * Client topology used during activation.
     *
     * <p>The topology contains normalized master and worker endpoints.</p>
     */
    private LinkUpClientTopology topology;

    /**
     * Probe results of all probed master endpoints.
     *
     * <p>These results can be persisted or returned for diagnostics when activation
     * fails or when some nodes are unavailable.</p>
     */
    private List<LinkUpClientProbeResult> probeResults;

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
     * @param version LinkUp client version resolved from the active master
     * @return successful activation result
     */
    public static LinkUpClientActivationResult live(
            LinkUpClientTopology topology,
            List<LinkUpClientProbeResult> probeResults,
            LinkUpClientEndpoint activeMaster,
            String version
    ) {
        return LinkUpClientActivationResult.builder()
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
    public static LinkUpClientActivationResult dead(
            LinkUpClientTopology topology,
            List<LinkUpClientProbeResult> probeResults,
            String errorMessage
    ) {
        return LinkUpClientActivationResult.builder()
                .live(false)
                .clientHealthStatus("DEAD")
                .topology(topology)
                .probeResults(probeResults)
                .errorMessage(errorMessage)
                .build();
    }
}
