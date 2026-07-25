package io.yak.ops.application.port;

import io.yak.ops.engine.api.EngineEndpoint;
import java.util.Optional;

/** Application port for resolving configured execution endpoints. */
public interface EngineEndpointRepository {
    Optional<EngineEndpoint> findById(String engineEndpointId);
}
