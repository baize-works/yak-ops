package io.yak.ops.application.client.port;

import io.yak.ops.application.client.model.LinkUpClientAuthInfo;
import io.yak.ops.application.client.model.LinkUpClientEndpoint;
import io.yak.ops.application.client.model.LinkUpClientProbeResult;

/**
 * Gateway interface for probing a LinkUp client endpoint.
 *
 * <p>This port belongs to the core client module and only defines the probing
 * capability. The actual implementation can be based on LinkUp REST API,
 * SDK, or any other runtime communication mechanism.</p>
 */
public interface LinkUpClientProbeGateway {

    /**
     * Probes the given LinkUp endpoint and returns its runtime status.
     *
     * <p>The implementation should check whether the endpoint is reachable,
     * resolve the LinkUp client version when possible, and return detailed
     * error information when the probe fails.</p>
     *
     * @param endpoint LinkUp client endpoint to be probed
     * @param auth authentication information used when calling the endpoint
     * @return probe result, including live status, version, raw response, or error message
     */
    LinkUpClientProbeResult probe(
            LinkUpClientEndpoint endpoint,
            LinkUpClientAuthInfo auth
    );
}
