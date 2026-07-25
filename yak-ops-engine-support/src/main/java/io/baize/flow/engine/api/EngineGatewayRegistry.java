package io.baize.flow.engine.api;

import java.util.Collection;
import java.util.EnumMap;
import java.util.Map;

public final class EngineGatewayRegistry {
    private final Map<EngineType, EngineGateway> gateways;
    public EngineGatewayRegistry(Collection<? extends EngineGateway> gateways) {
        Map<EngineType, EngineGateway> registered = new EnumMap<>(EngineType.class);
        for (EngineGateway gateway : gateways) registered.put(gateway.engineType(), gateway);
        this.gateways = Map.copyOf(registered);
    }
    public EngineGateway get(EngineType type) {
        EngineGateway gateway = gateways.get(type);
        if (gateway == null) throw new EngineException(EngineException.Code.ENDPOINT_INVALID, "No engine gateway registered for " + type);
        return gateway;
    }
}
