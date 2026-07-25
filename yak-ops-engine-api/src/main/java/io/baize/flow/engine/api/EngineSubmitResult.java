package io.baize.flow.engine.api;

import java.util.Objects;
public record EngineSubmitResult(String jobId, EngineJobStatus status) { public EngineSubmitResult { Objects.requireNonNull(jobId, "jobId"); status = status == null ? EngineJobStatus.SUBMITTED : status; } }
