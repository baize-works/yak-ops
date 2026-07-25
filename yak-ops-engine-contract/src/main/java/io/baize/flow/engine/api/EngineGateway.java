package io.baize.flow.engine.api;

public interface EngineGateway {
    ExecutionEngine engine();
    JobExecution submit(JobSubmitCommand command);
    JobExecution execution(EngineEndpoint endpoint, String platformExecutionId, String externalExecutionId);
    void cancel(EngineEndpoint endpoint, String externalExecutionId);
    default void pause(EngineEndpoint endpoint, String externalExecutionId) {
        throw new UnsupportedEngineCapabilityException(EngineCapabilities.Capability.PAUSE);
    }
    default void resume(EngineEndpoint endpoint, String externalExecutionId) {
        throw new UnsupportedEngineCapabilityException(EngineCapabilities.Capability.RESUME);
    }
    EngineHealth health(EngineEndpoint endpoint);
    EngineCapabilities capabilities();
}
