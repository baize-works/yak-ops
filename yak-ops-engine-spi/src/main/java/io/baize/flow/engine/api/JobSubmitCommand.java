package io.baize.flow.engine.api;

import java.util.Map;
import java.util.Objects;

/** Complete, engine-neutral request to submit a job to an endpoint. */
public record JobSubmitCommand(EngineEndpoint endpoint, String definition, String name, Map<String, String> attributes) {
    public JobSubmitCommand {
        Objects.requireNonNull(endpoint, "endpoint");
        Objects.requireNonNull(definition, "definition");
        attributes = attributes == null ? Map.of() : Map.copyOf(attributes);
    }
}
