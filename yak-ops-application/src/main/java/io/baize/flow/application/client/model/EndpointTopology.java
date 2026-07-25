package io.baize.flow.application.client.model;

import java.util.List;
import java.util.Objects;

/** Normalized collection of addresses belonging to a logical endpoint. */
public record EndpointTopology(List<String> addresses, String preferredAddress) {
    public EndpointTopology {
        addresses = addresses == null ? List.of() : List.copyOf(addresses);
        if (addresses.isEmpty()) throw new IllegalArgumentException("topology must contain an address");
        preferredAddress = Objects.requireNonNullElse(preferredAddress, addresses.get(0));
        if (!addresses.contains(preferredAddress)) throw new IllegalArgumentException("preferred address is not in topology");
    }
}
