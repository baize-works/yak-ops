package io.baize.flow.engine.api;
import java.util.Map;
public final class EngineSubmissionException extends EngineContractException {
    public EngineSubmissionException(String message, Throwable cause, Map<String, String> metadata) { super(message, cause, metadata); }
    public EngineSubmissionException(String message, Map<String, String> metadata) { this(message, null, metadata); }
}
