package io.baize.flow.engine.seatunnel.rest;

import io.baize.flow.engine.api.EngineConnectionConfig;
import io.baize.flow.engine.api.EngineConnectionConfigProvider;
import io.baize.flow.engine.api.EngineEndpoint;
import io.baize.flow.engine.api.ExecutionEngine;
import io.baize.flow.engine.seatunnel.model.SeaTunnelClientAuth;
import org.springframework.stereotype.Component;

/** Resolves adapter transport settings from an application-owned connection configuration. */
@Component
public class SeaTunnelClientResolver {
    private final EngineConnectionConfigProvider connections;
    public SeaTunnelClientResolver(EngineConnectionConfigProvider connections) { this.connections = connections; }
    public String resolveBaseApiUrl(Long clientId) { return connection(clientId).baseUrl(); }
    public String resolveContextPath(Long clientId) { return connection(clientId).contextPath(); }
    public SeaTunnelClientAuth resolveAuth(Long clientId) {
        EngineConnectionConfig config = connection(clientId);
        SeaTunnelClientAuth auth = new SeaTunnelClientAuth();
        auth.setAuthEnabled(config.authenticationEnabled()); auth.setUsername(config.username()); auth.setPassword(config.password());
        return auth;
    }
    private EngineConnectionConfig connection(Long clientId) {
        if (clientId == null) throw new IllegalArgumentException("SeaTunnel client id must not be null");
        return connections.connectionFor(new EngineEndpoint(new ExecutionEngine("seatunnel"), String.valueOf(clientId), null, null, java.util.Map.of()));
    }
}
