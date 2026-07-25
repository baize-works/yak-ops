package io.baize.flow.application.client.model;

import java.util.List;

/** Engine-neutral activation outcome returned by endpoint use cases. */
public final class EndpointActivationResult {

    private final boolean active;
    private final String selectedAddress;
    private final List<EndpointProbeResult> probes;
    private final String message;

    public EndpointActivationResult(boolean active, String selectedAddress, List<EndpointProbeResult> probes, String message) {
        probes = probes == null ? java.util.Collections.emptyList() : java.util.Collections.unmodifiableList(new java.util.ArrayList<>(probes));
        if (active && selectedAddress == null) throw new IllegalArgumentException("active endpoint requires a selected address");
        this.active = active;
        this.selectedAddress = selectedAddress;
        this.probes = probes;
        this.message = message;
    }

    public boolean active() { return active; }


    public boolean isActive() { return active; }

    public String selectedAddress() { return selectedAddress; }


    public String getSelectedAddress() { return selectedAddress; }

    public List<EndpointProbeResult> probes() { return probes; }


    public List<EndpointProbeResult> getProbes() { return probes; }

    public String message() { return message; }


    public String getMessage() { return message; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        EndpointActivationResult that = (EndpointActivationResult) o;
        return active == that.active && java.util.Objects.equals(selectedAddress, that.selectedAddress) && java.util.Objects.equals(probes, that.probes) && java.util.Objects.equals(message, that.message);
    }

    @Override
    public int hashCode() { return java.util.Objects.hash(active, selectedAddress, probes, message); }

    @Override
    public String toString() {
        return "EndpointActivationResult[" + "active=" + active + ", " + "selectedAddress=" + selectedAddress + ", " + "probes=" + probes + ", " + "message=" + message + "]";
    }
}
