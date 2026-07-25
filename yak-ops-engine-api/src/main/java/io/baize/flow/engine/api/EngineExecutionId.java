package io.baize.flow.engine.api;

import java.util.Objects;

/** Opaque execution identifier allocated by an engine. */
public record EngineExecutionId(String value) {
    public EngineExecutionId {
        value = Objects.requireNonNull(value, "value").trim();
        if (value.isEmpty()) throw new IllegalArgumentException("execution id must not be blank");
    }
}
