package io.yak.ops.engine.api;

import java.util.EnumSet;
import java.util.Set;

/** Features which an application must negotiate before invoking an optional operation. */
public final class EngineCapabilities {
    public enum Capability { PAUSE, RESUME, METRICS, LOGS, CHECKPOINT }
    private final Set<Capability> supported;
    private EngineCapabilities(Set<Capability> supported) { this.supported = java.util.Collections.unmodifiableSet(new java.util.LinkedHashSet<>(supported)); }
    public static EngineCapabilities of(Capability... capabilities) {
        EnumSet<Capability> values = EnumSet.noneOf(Capability.class);
        if (capabilities != null) java.util.Collections.addAll(values, capabilities);
        return new EngineCapabilities(values);
    }
    public static EngineCapabilities none() { return new EngineCapabilities(java.util.Collections.emptySet()); }
    public boolean supports(Capability capability) { return supported.contains(capability); }
    public Set<Capability> supported() { return supported; }
    public void require(Capability capability) {
        if (!supports(capability)) throw new UnsupportedEngineCapabilityException(capability);
    }
}
