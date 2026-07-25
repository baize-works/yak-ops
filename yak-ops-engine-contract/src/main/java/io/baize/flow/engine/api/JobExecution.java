package io.baize.flow.engine.api;

import java.time.Instant;
import java.util.Map;
import java.util.Objects;

/** Snapshot returned by an execution engine. */
public final class JobExecution {

    private final String platformExecutionId;
    private final String externalExecutionId;
    private final JobExecutionStatus status;
    private final Instant submittedAt;
    private final Instant startedAt;
    private final Instant finishedAt;
    private final Instant updatedAt;
    private final String diagnosticMessage;
    private final Map<String, String> diagnosticMetadata;

    public JobExecution(String platformExecutionId, String externalExecutionId, JobExecutionStatus status, Instant submittedAt, Instant startedAt, Instant finishedAt, Instant updatedAt, String diagnosticMessage, Map<String, String> diagnosticMetadata) {
        platformExecutionId = Objects.requireNonNull(platformExecutionId, "platformExecutionId");
        status = status == null ? JobExecutionStatus.UNKNOWN : status;
        diagnosticMetadata = diagnosticMetadata == null ? java.util.Collections.emptyMap() : java.util.Collections.unmodifiableMap(new java.util.LinkedHashMap<>(diagnosticMetadata));
        this.platformExecutionId = platformExecutionId;
        this.externalExecutionId = externalExecutionId;
        this.status = status;
        this.submittedAt = submittedAt;
        this.startedAt = startedAt;
        this.finishedAt = finishedAt;
        this.updatedAt = updatedAt;
        this.diagnosticMessage = diagnosticMessage;
        this.diagnosticMetadata = diagnosticMetadata;
    }

    public String platformExecutionId() { return platformExecutionId; }


    public String getPlatformExecutionId() { return platformExecutionId; }

    public String externalExecutionId() { return externalExecutionId; }


    public String getExternalExecutionId() { return externalExecutionId; }

    public JobExecutionStatus status() { return status; }


    public JobExecutionStatus getStatus() { return status; }

    public Instant submittedAt() { return submittedAt; }


    public Instant getSubmittedAt() { return submittedAt; }

    public Instant startedAt() { return startedAt; }


    public Instant getStartedAt() { return startedAt; }

    public Instant finishedAt() { return finishedAt; }


    public Instant getFinishedAt() { return finishedAt; }

    public Instant updatedAt() { return updatedAt; }


    public Instant getUpdatedAt() { return updatedAt; }

    public String diagnosticMessage() { return diagnosticMessage; }


    public String getDiagnosticMessage() { return diagnosticMessage; }

    public Map<String, String> diagnosticMetadata() { return diagnosticMetadata; }


    public Map<String, String> getDiagnosticMetadata() { return diagnosticMetadata; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        JobExecution that = (JobExecution) o;
        return java.util.Objects.equals(platformExecutionId, that.platformExecutionId) && java.util.Objects.equals(externalExecutionId, that.externalExecutionId) && java.util.Objects.equals(status, that.status) && java.util.Objects.equals(submittedAt, that.submittedAt) && java.util.Objects.equals(startedAt, that.startedAt) && java.util.Objects.equals(finishedAt, that.finishedAt) && java.util.Objects.equals(updatedAt, that.updatedAt) && java.util.Objects.equals(diagnosticMessage, that.diagnosticMessage) && java.util.Objects.equals(diagnosticMetadata, that.diagnosticMetadata);
    }

    @Override
    public int hashCode() { return java.util.Objects.hash(platformExecutionId, externalExecutionId, status, submittedAt, startedAt, finishedAt, updatedAt, diagnosticMessage, diagnosticMetadata); }

    @Override
    public String toString() {
        return "JobExecution[" + "platformExecutionId=" + platformExecutionId + ", " + "externalExecutionId=" + externalExecutionId + ", " + "status=" + status + ", " + "submittedAt=" + submittedAt + ", " + "startedAt=" + startedAt + ", " + "finishedAt=" + finishedAt + ", " + "updatedAt=" + updatedAt + ", " + "diagnosticMessage=" + diagnosticMessage + ", " + "diagnosticMetadata=" + diagnosticMetadata + "]";
    }
}
