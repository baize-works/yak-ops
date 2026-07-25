package io.yak.ops.application.client.model;

import lombok.Builder;
import lombok.Data;

/**
 * Probe result of a SeaTunnel client endpoint.
 *
 * <p>This model represents the result of one endpoint probing operation. It is used
 * during client activation, node refresh, and health diagnostics.</p>
 */
@Data
@Builder
public class SeaTunnelClientProbeResult {

    /**
     * Whether the endpoint is reachable and considered alive.
     */
    private boolean live;

    /**
     * The endpoint that was probed.
     */
    private SeaTunnelClientEndpoint endpoint;

    /**
     * SeaTunnel client version resolved from the endpoint.
     *
     * <p>This value is meaningful only when the endpoint is alive.</p>
     */
    private String clientVersion;

    /**
     * Raw response returned by the endpoint.
     *
     * <p>This field is optional and mainly used for debugging or future diagnostics.</p>
     */
    private Object rawResponse;

    /**
     * Error message returned when the endpoint is not alive.
     */
    private String errorMessage;

    /**
     * Creates a successful probe result.
     *
     * @param endpoint probed endpoint
     * @param version SeaTunnel client version
     * @param raw raw response returned by the endpoint
     * @return live probe result
     */
    public static SeaTunnelClientProbeResult live(
            SeaTunnelClientEndpoint endpoint,
            String version,
            Object raw
    ) {
        return SeaTunnelClientProbeResult.builder()
                .live(true)
                .endpoint(endpoint)
                .clientVersion(version)
                .rawResponse(raw)
                .build();
    }

    /**
     * Creates a failed probe result.
     *
     * @param endpoint probed endpoint
     * @param error failure reason
     * @return dead probe result
     */
    public static SeaTunnelClientProbeResult dead(
            SeaTunnelClientEndpoint endpoint,
            String error
    ) {
        return SeaTunnelClientProbeResult.builder()
                .live(false)
                .endpoint(endpoint)
                .errorMessage(error)
                .build();
    }
}
