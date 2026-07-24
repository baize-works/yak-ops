package io.baize.flow.engine.api;

import java.util.Objects;

/** Identifies an engine connection without exposing vendor transport details. */
public record EngineEndpoint(EngineType engineType, String endpointId, String baseUrl) {
    public EngineEndpoint { Objects.requireNonNull(engineType, "engineType"); Objects.requireNonNull(endpointId, "endpointId"); }
    public static EngineEndpoint seatunnel(long clientId) { return new EngineEndpoint(EngineType.SEATUNNEL, Long.toString(clientId), null); }
}
