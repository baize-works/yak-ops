package io.baize.flow.engine.api;

import java.util.Map;
import java.util.Objects;

/** Complete, engine-neutral request to submit a job to an endpoint. */
public record JobSubmitCommand(EngineEndpoint endpoint, String definition, Map<String, String> runtimeParameters,
                               String idempotencyKey) {
    public JobSubmitCommand {
        Objects.requireNonNull(endpoint, "endpoint");
        Objects.requireNonNull(definition, "definition");
        runtimeParameters = runtimeParameters == null ? Map.of() : Map.copyOf(runtimeParameters);
        idempotencyKey = Objects.requireNonNull(idempotencyKey, "idempotencyKey").trim();
        if (idempotencyKey.isEmpty()) throw new IllegalArgumentException("idempotencyKey must not be blank");
    }
}
