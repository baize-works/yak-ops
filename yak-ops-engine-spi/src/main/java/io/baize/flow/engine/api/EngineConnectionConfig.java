package io.baize.flow.engine.api;

import java.util.Objects;

/** Connection details supplied by the application; adapters never load DAO entities. */
public record EngineConnectionConfig(String baseUrl, String contextPath, boolean authenticationEnabled,
                                     String username, String password) {
    public EngineConnectionConfig {
        Objects.requireNonNull(baseUrl, "baseUrl");
    }
}
