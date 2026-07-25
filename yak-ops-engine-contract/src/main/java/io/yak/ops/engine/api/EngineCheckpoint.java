package io.yak.ops.engine.api;
import java.time.Instant;
import java.util.Map;
public final class EngineCheckpoint {

    private final String id;
    private final Instant createdAt;
    private final String status;
    private final Map<String, String> metadata;

    public EngineCheckpoint(String id, Instant createdAt, String status, Map<String, String> metadata) {
        metadata = metadata == null ? java.util.Collections.emptyMap() : java.util.Collections.unmodifiableMap(new java.util.LinkedHashMap<>(metadata));
        this.id = id;
        this.createdAt = createdAt;
        this.status = status;
        this.metadata = metadata;
    }

    public String id() { return id; }


    public String getId() { return id; }

    public Instant createdAt() { return createdAt; }


    public Instant getCreatedAt() { return createdAt; }

    public String status() { return status; }


    public String getStatus() { return status; }

    public Map<String, String> metadata() { return metadata; }


    public Map<String, String> getMetadata() { return metadata; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        EngineCheckpoint that = (EngineCheckpoint) o;
        return java.util.Objects.equals(id, that.id) && java.util.Objects.equals(createdAt, that.createdAt) && java.util.Objects.equals(status, that.status) && java.util.Objects.equals(metadata, that.metadata);
    }

    @Override
    public int hashCode() { return java.util.Objects.hash(id, createdAt, status, metadata); }

    @Override
    public String toString() {
        return "EngineCheckpoint[" + "id=" + id + ", " + "createdAt=" + createdAt + ", " + "status=" + status + ", " + "metadata=" + metadata + "]";
    }
}
