package io.baize.flow.engine.api;
import java.util.Map;
public final class EngineUnavailableException extends EngineContractException {
    public EngineUnavailableException(String message, Throwable cause, Map<String, String> metadata) { super(message, cause, metadata); }
    public EngineUnavailableException(String message, Map<String, String> metadata) { this(message, null, metadata); }
}
