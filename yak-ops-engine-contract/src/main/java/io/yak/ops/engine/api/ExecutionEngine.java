package io.yak.ops.engine.api;

import java.util.Locale;
import java.util.Objects;

/** Stable, vendor-neutral identity of an execution engine implementation. */
public final class ExecutionEngine {

    private final String key;
    private final String description;

    public ExecutionEngine(String key, String description) {
        key = Objects.requireNonNull(key, "key").trim().toLowerCase(Locale.ROOT);
        if (key.isEmpty()) throw new IllegalArgumentException("engine key must not be blank");
        description = description == null ? "" : description.trim();
        this.key = key;
        this.description = description;
    }

    public String key() { return key; }


    public String getKey() { return key; }

    public String description() { return description; }


    public String getDescription() { return description; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ExecutionEngine that = (ExecutionEngine) o;
        return java.util.Objects.equals(key, that.key) && java.util.Objects.equals(description, that.description);
    }

    @Override
    public int hashCode() { return java.util.Objects.hash(key, description); }

    @Override
    public String toString() {
        return "ExecutionEngine[" + "key=" + key + ", " + "description=" + description + "]";
    }



    public ExecutionEngine(String key) { this(key, ""); }
}
