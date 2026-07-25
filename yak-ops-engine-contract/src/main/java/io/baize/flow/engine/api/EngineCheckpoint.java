package io.baize.flow.engine.api;
import java.time.Instant;
import java.util.Map;
public record EngineCheckpoint(String id, Instant createdAt, String status, Map<String, String> metadata) {
    public EngineCheckpoint { metadata = metadata == null ? Map.of() : Map.copyOf(metadata); }
}
