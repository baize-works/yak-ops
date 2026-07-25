package io.baize.flow.application.client.model;

import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Engine-neutral endpoint configuration accepted by endpoint use cases. */
public record EngineEndpointSpec(String engineKey, String name, List<String> addresses,
                                 String authenticationReference, Map<String, String> attributes) {
    public EngineEndpointSpec {
        engineKey = Objects.requireNonNull(engineKey, "engineKey");
        name = Objects.requireNonNull(name, "name");
        addresses = addresses == null ? List.of() : List.copyOf(addresses);
        if (addresses.isEmpty()) throw new IllegalArgumentException("at least one endpoint address is required");
        attributes = attributes == null ? Map.of() : Map.copyOf(attributes);
    }
}
