package io.baize.flow.engine.api;

public interface EngineGateway {
    EngineType engineType();
    EngineSubmitResult submit(EngineEndpoint endpoint, EngineSubmitCommand command);
    void stop(EngineEndpoint endpoint, String jobId);
    EngineJobSnapshot job(EngineEndpoint endpoint, String jobId);
    EngineMetrics metrics(EngineEndpoint endpoint, String jobId);
    EngineHealth health(EngineEndpoint endpoint);
    EngineCapabilities capabilities();
}
