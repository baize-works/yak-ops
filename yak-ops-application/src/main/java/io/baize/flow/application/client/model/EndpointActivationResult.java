package io.baize.flow.application.client.model;

import java.util.List;

/** Engine-neutral activation outcome returned by endpoint use cases. */
public record EndpointActivationResult(boolean active, String selectedAddress,
                                       List<EndpointProbeResult> probes, String message) {
    public EndpointActivationResult {
        probes = probes == null ? List.of() : List.copyOf(probes);
        if (active && selectedAddress == null) throw new IllegalArgumentException("active endpoint requires a selected address");
    }
}
