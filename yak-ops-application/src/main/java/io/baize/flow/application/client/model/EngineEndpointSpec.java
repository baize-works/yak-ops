package io.baize.flow.application.client.model;

import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Engine-neutral endpoint configuration accepted by endpoint use cases. */
public final class EngineEndpointSpec {

    private final String engineKey;
    private final String name;
    private final List<String> addresses;
    private final String authenticationReference;
    private final Map<String, String> attributes;

    public EngineEndpointSpec(String engineKey, String name, List<String> addresses, String authenticationReference, Map<String, String> attributes) {
        engineKey = Objects.requireNonNull(engineKey, "engineKey");
        name = Objects.requireNonNull(name, "name");
        addresses = addresses == null ? java.util.Collections.emptyList() : java.util.Collections.unmodifiableList(new java.util.ArrayList<>(addresses));
        if (addresses.isEmpty()) throw new IllegalArgumentException("at least one endpoint address is required");
        attributes = attributes == null ? java.util.Collections.emptyMap() : java.util.Collections.unmodifiableMap(new java.util.LinkedHashMap<>(attributes));
        this.engineKey = engineKey;
        this.name = name;
        this.addresses = addresses;
        this.authenticationReference = authenticationReference;
        this.attributes = attributes;
    }

    public String engineKey() { return engineKey; }


    public String getEngineKey() { return engineKey; }

    public String name() { return name; }


    public String getName() { return name; }

    public List<String> addresses() { return addresses; }


    public List<String> getAddresses() { return addresses; }

    public String authenticationReference() { return authenticationReference; }


    public String getAuthenticationReference() { return authenticationReference; }

    public Map<String, String> attributes() { return attributes; }


    public Map<String, String> getAttributes() { return attributes; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        EngineEndpointSpec that = (EngineEndpointSpec) o;
        return java.util.Objects.equals(engineKey, that.engineKey) && java.util.Objects.equals(name, that.name) && java.util.Objects.equals(addresses, that.addresses) && java.util.Objects.equals(authenticationReference, that.authenticationReference) && java.util.Objects.equals(attributes, that.attributes);
    }

    @Override
    public int hashCode() { return java.util.Objects.hash(engineKey, name, addresses, authenticationReference, attributes); }

    @Override
    public String toString() {
        return "EngineEndpointSpec[" + "engineKey=" + engineKey + ", " + "name=" + name + ", " + "addresses=" + addresses + ", " + "authenticationReference=" + authenticationReference + ", " + "attributes=" + attributes + "]";
    }
}
