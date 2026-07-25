package io.baize.flow.api.port;

import io.baize.flow.engine.api.EngineEndpoint;
import java.util.Optional;

/** Application port for resolving configured execution endpoints. */
public interface EngineEndpointRepository {
    Optional<EngineEndpoint> findById(String engineEndpointId);
}
