package io.baize.flow.engine.api;
import java.util.Map;
public final class UnsupportedEngineCapabilityException extends EngineContractException {
    private final EngineCapabilities.Capability capability;
    public UnsupportedEngineCapabilityException(EngineCapabilities.Capability capability) {
        super("Engine capability is not supported: " + capability, null, Map.of("capability", capability.name()));
        this.capability = capability;
    }
    public EngineCapabilities.Capability capability() { return capability; }
}
