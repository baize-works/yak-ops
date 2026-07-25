package io.yak.ops.engine.api;
import java.time.Instant;
public final class EngineLogEntry {

    private final Instant timestamp;
    private final String level;
    private final String message;

    public EngineLogEntry(Instant timestamp, String level, String message) {
        this.timestamp = timestamp;
        this.level = level;
        this.message = message;
    }

    public Instant timestamp() { return timestamp; }


    public Instant getTimestamp() { return timestamp; }

    public String level() { return level; }


    public String getLevel() { return level; }

    public String message() { return message; }


    public String getMessage() { return message; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        EngineLogEntry that = (EngineLogEntry) o;
        return java.util.Objects.equals(timestamp, that.timestamp) && java.util.Objects.equals(level, that.level) && java.util.Objects.equals(message, that.message);
    }

    @Override
    public int hashCode() { return java.util.Objects.hash(timestamp, level, message); }

    @Override
    public String toString() {
        return "EngineLogEntry[" + "timestamp=" + timestamp + ", " + "level=" + level + ", " + "message=" + message + "]";
    }
}
