package io.baize.flow.application.service.application.job;

import io.baize.flow.application.port.EngineEndpointRepository;
import io.baize.flow.engine.api.*;
import org.springframework.stereotype.Component;

/** Capability-negotiating application use case; it never assumes a particular vendor feature. */
@Component
public final class QueryEngineMetricsUseCase {
    private final EngineEndpointRepository endpoints; private final EngineGatewayRegistry gateways;
    public QueryEngineMetricsUseCase(EngineEndpointRepository endpoints, EngineGatewayRegistry gateways) { this.endpoints=endpoints; this.gateways=gateways; }
    public EngineMetrics query(String endpointId, String externalExecutionId) {
        EngineEndpoint endpoint=endpoints.findById(endpointId).orElseThrow(() -> new IllegalArgumentException("Engine endpoint does not exist: "+endpointId));
        EngineGateway gateway=gateways.get(endpoint.engine());
        gateway.capabilities().require(EngineCapabilities.Capability.METRICS);
        if (!(gateway instanceof EngineMetricsGateway)) throw new IllegalStateException("Adapter advertises METRICS without implementing its sub-port");
        EngineMetricsGateway metrics = (EngineMetricsGateway) gateway;
        return metrics.metrics(endpoint, externalExecutionId);
    }
}
