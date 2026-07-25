package io.baize.flow.engine.api;

/** Engine-neutral failure with a stable, machine-readable code. */
public class EngineException extends RuntimeException {
    public enum Code { ENDPOINT_INVALID, UNSUPPORTED_OPERATION, SUBMISSION_FAILED, JOB_NOT_FOUND, TRANSPORT_FAILURE, RESPONSE_INVALID }
    private final Code code;
    public EngineException(Code code, String message) { super(message); this.code = code; }
    public EngineException(Code code, String message, Throwable cause) { super(message, cause); this.code = code; }
    public Code code() { return code; }
}
