package io.baize.flow.engine.api;

import java.time.Instant;
import java.util.Map;
import java.util.Objects;

/** Snapshot returned by an execution engine. */
public record JobExecution(String platformExecutionId, String externalExecutionId, JobExecutionStatus status,
                           Instant submittedAt, Instant startedAt, Instant finishedAt, Instant updatedAt,
                           String diagnosticMessage, Map<String, String> diagnosticMetadata) {
    public JobExecution {
        platformExecutionId = Objects.requireNonNull(platformExecutionId, "platformExecutionId");
        status = status == null ? JobExecutionStatus.UNKNOWN : status;
        diagnosticMetadata = diagnosticMetadata == null ? Map.of() : Map.copyOf(diagnosticMetadata);
    }
}
