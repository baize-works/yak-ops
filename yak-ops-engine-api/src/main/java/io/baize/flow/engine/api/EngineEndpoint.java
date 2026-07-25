package io.baize.flow.engine.api;

import java.util.Map;
import java.util.Objects;

/** Connection description passed across the engine boundary. */
public record EngineEndpoint(
        ExecutionEngine engine,
        String endpointId,
        String address,
        String authenticationReference,
        Map<String, String> attributes) {
    public EngineEndpoint {
        Objects.requireNonNull(engine, "engine");
        endpointId = Objects.requireNonNull(endpointId, "endpointId").trim();
        if (endpointId.isEmpty()) throw new IllegalArgumentException("endpointId must not be blank");
        attributes = attributes == null ? Map.of() : Map.copyOf(attributes);
    }

    /** Compatibility constructor for adapters which have not yet adopted engine keys. */
    public EngineEndpoint(EngineType engineType, String endpointId, String address) {
        this(new ExecutionEngine(engineType.name()), endpointId, address, null, Map.of());
    }

    /** Legacy adapter discriminator; application code should use {@link #engine()}. */
    public EngineType engineType() { return EngineType.valueOf(engine.key().toUpperCase(java.util.Locale.ROOT)); }
}
