package io.baize.flow.application.client.model;

import java.time.Instant;
import java.util.Map;

/** Adapter-normalized result of probing one endpoint address. */
public record EndpointProbeResult(String address, boolean reachable, String engineVersion,
                                  String message, Instant observedAt, Map<String, String> attributes) {
    public EndpointProbeResult {
        observedAt = observedAt == null ? Instant.now() : observedAt;
        attributes = attributes == null ? Map.of() : Map.copyOf(attributes);
    }
}
