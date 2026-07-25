package io.baize.flow.engine.api;

import java.util.Map;
import java.util.Objects;

/** Connection description passed across the engine boundary. */
public final class EngineEndpoint {

    private final ExecutionEngine engine;
    private final String endpointId;
    private final String address;
    private final String authenticationReference;
    private final Map<String, String> attributes;

    public EngineEndpoint(ExecutionEngine engine, String endpointId, String address, String authenticationReference, Map<String, String> attributes) {
        Objects.requireNonNull(engine, "engine");
        endpointId = Objects.requireNonNull(endpointId, "endpointId").trim();
        if (endpointId.isEmpty()) throw new IllegalArgumentException("endpointId must not be blank");
        attributes = attributes == null ? java.util.Collections.emptyMap() : java.util.Collections.unmodifiableMap(new java.util.LinkedHashMap<>(attributes));
        this.engine = engine;
        this.endpointId = endpointId;
        this.address = address;
        this.authenticationReference = authenticationReference;
        this.attributes = attributes;
    }

    public ExecutionEngine engine() { return engine; }


    public ExecutionEngine getEngine() { return engine; }

    public String endpointId() { return endpointId; }


    public String getEndpointId() { return endpointId; }

    public String address() { return address; }


    public String getAddress() { return address; }

    public String authenticationReference() { return authenticationReference; }


    public String getAuthenticationReference() { return authenticationReference; }

    public Map<String, String> attributes() { return attributes; }


    public Map<String, String> getAttributes() { return attributes; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        EngineEndpoint that = (EngineEndpoint) o;
        return java.util.Objects.equals(engine, that.engine) && java.util.Objects.equals(endpointId, that.endpointId) && java.util.Objects.equals(address, that.address) && java.util.Objects.equals(authenticationReference, that.authenticationReference) && java.util.Objects.equals(attributes, that.attributes);
    }

    @Override
    public int hashCode() { return java.util.Objects.hash(engine, endpointId, address, authenticationReference, attributes); }

    @Override
    public String toString() {
        return "EngineEndpoint[" + "engine=" + engine + ", " + "endpointId=" + endpointId + ", " + "address=" + address + ", " + "authenticationReference=" + authenticationReference + ", " + "attributes=" + attributes + "]";
    }
}
