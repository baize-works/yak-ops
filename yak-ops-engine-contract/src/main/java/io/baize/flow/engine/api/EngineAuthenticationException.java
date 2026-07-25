package io.baize.flow.engine.api;
import java.util.Map;
public final class EngineAuthenticationException extends EngineContractException {
    public EngineAuthenticationException(String message, Throwable cause, Map<String, String> metadata) { super(message, cause, metadata); }
    public EngineAuthenticationException(String message, Map<String, String> metadata) { this(message, null, metadata); }
}
