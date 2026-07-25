package io.yak.ops.engine.api;

import java.util.Collection;
import java.util.Map;

public final class EngineGatewayRegistry {
    private final Map<String, EngineGateway> gateways;
    public EngineGatewayRegistry(Collection<? extends EngineGateway> gateways) {
        Map<String, EngineGateway> registered = new java.util.HashMap<>();
        for (EngineGateway gateway : gateways) {
            if (registered.put(gateway.engine().key(), gateway) != null)
                throw new IllegalArgumentException("Duplicate engine gateway: " + gateway.engine().key());
        }
        this.gateways = java.util.Collections.unmodifiableMap(new java.util.LinkedHashMap<>(registered));
    }
    public EngineGateway get(ExecutionEngine engine) {
        EngineGateway gateway = gateways.get(engine.key());
        if (gateway == null) throw new IllegalArgumentException("No engine gateway registered for " + engine.key());
        return gateway;
    }
}
