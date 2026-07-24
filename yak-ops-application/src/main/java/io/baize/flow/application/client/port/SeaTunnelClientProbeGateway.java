package io.baize.flow.application.client.port;

import io.baize.flow.application.client.model.SeaTunnelClientAuthInfo;
import io.baize.flow.application.client.model.SeaTunnelClientEndpoint;
import io.baize.flow.application.client.model.SeaTunnelClientProbeResult;

/**
 * Gateway interface for probing a SeaTunnel client endpoint.
 *
 * <p>This port belongs to the core client module and only defines the probing
 * capability. The actual implementation can be based on SeaTunnel REST API,
 * SDK, or any other runtime communication mechanism.</p>
 */
public interface SeaTunnelClientProbeGateway {

    /**
     * Probes the given SeaTunnel endpoint and returns its runtime status.
     *
     * <p>The implementation should check whether the endpoint is reachable,
     * resolve the SeaTunnel client version when possible, and return detailed
     * error information when the probe fails.</p>
     *
     * @param endpoint SeaTunnel client endpoint to be probed
     * @param auth authentication information used when calling the endpoint
     * @return probe result, including live status, version, raw response, or error message
     */
    SeaTunnelClientProbeResult probe(
            SeaTunnelClientEndpoint endpoint,
            SeaTunnelClientAuthInfo auth
    );
}