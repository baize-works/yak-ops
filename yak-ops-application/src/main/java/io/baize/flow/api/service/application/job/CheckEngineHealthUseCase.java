package io.baize.flow.api.service.application.job;

import io.baize.flow.api.port.EngineEndpointRepository;
import io.baize.flow.engine.api.EngineEndpoint;
import io.baize.flow.engine.api.EngineGatewayRegistry;
import org.springframework.stereotype.Component;

/** Application boundary for engine liveness probes used by scheduler adapters. */
@Component
public class CheckEngineHealthUseCase {
    private final EngineEndpointRepository endpoints;
    private final EngineGatewayRegistry gateways;

    public CheckEngineHealthUseCase(EngineEndpointRepository endpoints, EngineGatewayRegistry gateways) {
        this.endpoints = endpoints;
        this.gateways = gateways;
    }

    public boolean check(String engineEndpointId) {
        EngineEndpoint endpoint = endpoints.findById(engineEndpointId)
                .orElseThrow(() -> new IllegalArgumentException("Engine endpoint does not exist: " + engineEndpointId));
        return gateways.get(endpoint.engineType()).health(endpoint).healthy();
    }

    public boolean check(Long engineEndpointId) { return check(String.valueOf(engineEndpointId)); }
}
