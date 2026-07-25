package io.yak.ops.application.client.model;

import java.time.Instant;
import java.util.Map;

/** Adapter-normalized result of probing one endpoint address. */
public final class EndpointProbeResult {

    private final String address;
    private final boolean reachable;
    private final String engineVersion;
    private final String message;
    private final Instant observedAt;
    private final Map<String, String> attributes;

    public EndpointProbeResult(String address, boolean reachable, String engineVersion, String message, Instant observedAt, Map<String, String> attributes) {
        observedAt = observedAt == null ? Instant.now() : observedAt;
        attributes = attributes == null ? java.util.Collections.emptyMap() : java.util.Collections.unmodifiableMap(new java.util.LinkedHashMap<>(attributes));
        this.address = address;
        this.reachable = reachable;
        this.engineVersion = engineVersion;
        this.message = message;
        this.observedAt = observedAt;
        this.attributes = attributes;
    }

    public String address() { return address; }


    public String getAddress() { return address; }

    public boolean reachable() { return reachable; }


    public boolean isReachable() { return reachable; }

    public String engineVersion() { return engineVersion; }


    public String getEngineVersion() { return engineVersion; }

    public String message() { return message; }


    public String getMessage() { return message; }

    public Instant observedAt() { return observedAt; }


    public Instant getObservedAt() { return observedAt; }

    public Map<String, String> attributes() { return attributes; }


    public Map<String, String> getAttributes() { return attributes; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        EndpointProbeResult that = (EndpointProbeResult) o;
        return java.util.Objects.equals(address, that.address) && reachable == that.reachable && java.util.Objects.equals(engineVersion, that.engineVersion) && java.util.Objects.equals(message, that.message) && java.util.Objects.equals(observedAt, that.observedAt) && java.util.Objects.equals(attributes, that.attributes);
    }

    @Override
    public int hashCode() { return java.util.Objects.hash(address, reachable, engineVersion, message, observedAt, attributes); }

    @Override
    public String toString() {
        return "EndpointProbeResult[" + "address=" + address + ", " + "reachable=" + reachable + ", " + "engineVersion=" + engineVersion + ", " + "message=" + message + ", " + "observedAt=" + observedAt + ", " + "attributes=" + attributes + "]";
    }
}
