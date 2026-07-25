package io.baize.flow.engine.api;

import java.util.Map;

/** Base for stable, vendor-neutral failures; adapter details belong in diagnostic metadata. */
public abstract class EngineContractException extends RuntimeException {
    private final Map<String, String> diagnosticMetadata;
    protected EngineContractException(String message, Throwable cause, Map<String, String> metadata) {
        super(message, cause);
        diagnosticMetadata = metadata == null ? Map.of() : Map.copyOf(metadata);
    }
    public Map<String, String> diagnosticMetadata() { return diagnosticMetadata; }
}
