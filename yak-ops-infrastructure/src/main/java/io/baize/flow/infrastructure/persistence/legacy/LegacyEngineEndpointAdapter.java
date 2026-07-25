package io.baize.flow.infrastructure.persistence.legacy;

import io.baize.flow.application.port.EngineEndpointRepository;
import io.baize.flow.dao.entity.SeaTunnelClient;
import io.baize.flow.dao.repository.SeaTunnelClientDao;
import io.baize.flow.engine.api.EngineConnectionConfig;
import io.baize.flow.engine.api.EngineConnectionConfigProvider;
import io.baize.flow.engine.api.EngineEndpoint;
import io.baize.flow.engine.api.EngineException;
import io.baize.flow.engine.api.ExecutionEngine;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Component;

/**
 * Compatibility adapter for endpoint records stored in the historical client table.
 * Persistence knowledge deliberately stops at this boundary.
 */
@Component
public final class LegacyEngineEndpointAdapter
        implements EngineEndpointRepository, EngineConnectionConfigProvider {
    private final SeaTunnelClientDao clients;

    public LegacyEngineEndpointAdapter(SeaTunnelClientDao clients) { this.clients = clients; }

    @Override
    public Optional<EngineEndpoint> findById(String engineEndpointId) {
        Long legacyId = numericId(engineEndpointId);
        SeaTunnelClient client = clients.queryById(legacyId);
        if (client == null) return Optional.empty();
        Map<String, String> attributes = client.getContextPath() == null
                ? Map.of() : Map.of("contextPath", client.getContextPath());
        return Optional.of(new EngineEndpoint(new ExecutionEngine("seatunnel"), engineEndpointId,
                client.getBaseUrl(), "legacy-client:" + engineEndpointId, attributes));
    }

    @Override
    public EngineConnectionConfig connectionFor(EngineEndpoint endpoint) {
        SeaTunnelClient client = clients.queryById(numericId(endpoint.endpointId()));
        if (client == null) throw invalid("Engine endpoint does not exist: " + endpoint.endpointId(), null);
        return new EngineConnectionConfig(client.getBaseUrl(), client.getContextPath(),
                Boolean.TRUE.equals(client.getAuthEnabled()), client.getUsername(), client.getPassword());
    }

    private Long numericId(String endpointId) {
        try { return Long.valueOf(endpointId); }
        catch (RuntimeException exception) { throw invalid("Invalid legacy engine endpoint id", exception); }
    }

    private EngineException invalid(String message, Throwable cause) {
        return cause == null ? new EngineException(EngineException.Code.ENDPOINT_INVALID, message)
                : new EngineException(EngineException.Code.ENDPOINT_INVALID, message, cause);
    }
}
