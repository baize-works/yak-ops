package io.baize.flow.engine.api;

public interface EngineGateway {
    EngineType engineType();
    default ExecutionEngine engine() { return new ExecutionEngine(engineType().name()); }
    default JobExecution submit(JobSubmitCommand command) {
        EngineSubmitResult result = submit(command.endpoint(),
                new EngineSubmitCommand(command.definition(), null, command.name()));
        return new JobExecution(new EngineExecutionId(result.jobId()), status(result.status()),
                java.time.Instant.now(), null, java.util.Map.of());
    }
    default JobExecution execution(EngineEndpoint endpoint, EngineExecutionId executionId) {
        EngineJobSnapshot snapshot = job(endpoint, executionId.value());
        return new JobExecution(executionId, status(snapshot.status()), java.time.Instant.now(),
                snapshot.errorMessage(), java.util.Map.of());
    }
    default void cancel(EngineEndpoint endpoint, EngineExecutionId executionId) { stop(endpoint, executionId.value()); }
    EngineSubmitResult submit(EngineEndpoint endpoint, EngineSubmitCommand command);
    void stop(EngineEndpoint endpoint, String jobId);
    EngineJobSnapshot job(EngineEndpoint endpoint, String jobId);
    EngineMetrics metrics(EngineEndpoint endpoint, String jobId);
    EngineHealth health(EngineEndpoint endpoint);
    EngineCapabilities capabilities();

    private static JobExecutionStatus status(EngineJobStatus status) {
        if (status == null) return JobExecutionStatus.UNKNOWN;
        return switch (status) {
            case SUBMITTED -> JobExecutionStatus.SUBMITTED;
            case RUNNING -> JobExecutionStatus.RUNNING;
            case FINISHED -> JobExecutionStatus.SUCCEEDED;
            case FAILED -> JobExecutionStatus.FAILED;
            case CANCELED -> JobExecutionStatus.CANCELED;
            case UNKNOWN -> JobExecutionStatus.UNKNOWN;
        };
    }
}
