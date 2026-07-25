package io.yak.ops.engine.api;
import java.util.Map;
public final class UnsupportedEngineCapabilityException extends EngineContractException {
    private final EngineCapabilities.Capability capability;
    public UnsupportedEngineCapabilityException(EngineCapabilities.Capability capability) {
        super("Engine capability is not supported: " + capability, null, java.util.Collections.singletonMap("capability", capability.name()));
        this.capability = capability;
    }
    public EngineCapabilities.Capability capability() { return capability; }
}
