package io.baize.flow.engine.api;

import java.time.Instant;
import java.util.Map;
import java.util.Objects;

/** Snapshot returned by an execution engine. */
public record JobExecution(EngineExecutionId executionId, JobExecutionStatus status, Instant updatedAt,
                           String message, Map<String, String> attributes) {
    public JobExecution {
        Objects.requireNonNull(executionId, "executionId");
        status = status == null ? JobExecutionStatus.UNKNOWN : status;
        attributes = attributes == null ? Map.of() : Map.copyOf(attributes);
    }
}
