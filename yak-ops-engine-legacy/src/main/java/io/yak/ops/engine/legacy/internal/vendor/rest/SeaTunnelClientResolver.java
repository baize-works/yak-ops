package io.yak.ops.engine.legacy.internal.vendor.rest;

import io.yak.ops.engine.api.EngineConnectionConfig;
import io.yak.ops.engine.api.EngineConnectionConfigProvider;
import io.yak.ops.engine.api.EngineEndpoint;
import io.yak.ops.engine.api.ExecutionEngine;
import io.yak.ops.engine.legacy.LegacyClientAuthentication;
import org.springframework.stereotype.Component;

/** Resolves adapter transport settings from an application-owned connection configuration. */
@Component("legacyEngineClientResolver")
public class SeaTunnelClientResolver {
    private final EngineConnectionConfigProvider connections;
    public SeaTunnelClientResolver(EngineConnectionConfigProvider connections) { this.connections = connections; }
    public String resolveBaseApiUrl(Long clientId) { return connection(clientId).baseUrl(); }
    public String resolveContextPath(Long clientId) { return connection(clientId).contextPath(); }
    public LegacyClientAuthentication resolveAuth(Long clientId) {
        EngineConnectionConfig config = connection(clientId);
        LegacyClientAuthentication auth = new LegacyClientAuthentication();
        auth.setAuthEnabled(config.authenticationEnabled()); auth.setUsername(config.username()); auth.setPassword(config.password());
        return auth;
    }
    private EngineConnectionConfig connection(Long clientId) {
        if (clientId == null) throw new IllegalArgumentException("SeaTunnel client id must not be null");
        return connections.connectionFor(new EngineEndpoint(new ExecutionEngine("legacy"), String.valueOf(clientId), null, null, java.util.Collections.emptyMap()));
    }
}
