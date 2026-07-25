package io.baize.flow.engine.api;

import java.util.Locale;
import java.util.Objects;

/** Stable, vendor-neutral identity of an execution engine implementation. */
public record ExecutionEngine(String key, String description) {
    public ExecutionEngine {
        key = Objects.requireNonNull(key, "key").trim().toLowerCase(Locale.ROOT);
        if (key.isEmpty()) throw new IllegalArgumentException("engine key must not be blank");
        description = description == null ? "" : description.trim();
    }

    public ExecutionEngine(String key) { this(key, ""); }
}
