package io.yak.ops.application.client.model;

import java.util.List;

/** Normalized collection of addresses belonging to a logical endpoint. */
public final class EndpointTopology {

    private final List<String> addresses;
    private final String preferredAddress;

    public EndpointTopology(List<String> addresses, String preferredAddress) {
        addresses = addresses == null ? java.util.Collections.emptyList() : java.util.Collections.unmodifiableList(new java.util.ArrayList<>(addresses));
        if (addresses.isEmpty()) throw new IllegalArgumentException("topology must contain an address");
        preferredAddress = preferredAddress == null ? addresses.get(0) : preferredAddress;
        if (!addresses.contains(preferredAddress)) throw new IllegalArgumentException("preferred address is not in topology");
        this.addresses = addresses;
        this.preferredAddress = preferredAddress;
    }

    public List<String> addresses() { return addresses; }


    public List<String> getAddresses() { return addresses; }

    public String preferredAddress() { return preferredAddress; }


    public String getPreferredAddress() { return preferredAddress; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        EndpointTopology that = (EndpointTopology) o;
        return java.util.Objects.equals(addresses, that.addresses) && java.util.Objects.equals(preferredAddress, that.preferredAddress);
    }

    @Override
    public int hashCode() { return java.util.Objects.hash(addresses, preferredAddress); }

    @Override
    public String toString() {
        return "EndpointTopology[" + "addresses=" + addresses + ", " + "preferredAddress=" + preferredAddress + "]";
    }
}
