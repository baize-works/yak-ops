package io.baize.flow.engine.api;
public final class EngineHealth {

    private final boolean healthy;
    private final String message;

    public EngineHealth(boolean healthy, String message) {
        this.healthy = healthy;
        this.message = message;
    }

    public boolean healthy() { return healthy; }


    public boolean isHealthy() { return healthy; }

    public String message() { return message; }


    public String getMessage() { return message; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        EngineHealth that = (EngineHealth) o;
        return healthy == that.healthy && java.util.Objects.equals(message, that.message);
    }

    @Override
    public int hashCode() { return java.util.Objects.hash(healthy, message); }

    @Override
    public String toString() {
        return "EngineHealth[" + "healthy=" + healthy + ", " + "message=" + message + "]";
    }
}
