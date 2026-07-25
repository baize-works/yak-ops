package io.baize.flow.domain.job;

import java.time.Instant;
import java.util.Objects;

/** Append-only history record for one submission attempt of a job instance. */
public final class JobExecutionRecord {

    private final Long id;
    private final long instanceId;
    private final int attemptNo;
    private final String engineType;
    private final Long engineEndpointId;
    private final String externalJobId;
    private final JobExecutionStatus submissionStatus;
    private final JobExecutionStatus executionStatus;
    private final Instant createdAt;
    private final Instant submittingAt;
    private final Instant submittedAt;
    private final Instant startedAt;
    private final Instant cancellingAt;
    private final Instant canceledAt;
    private final Instant finishedAt;
    private final Instant lastSyncedAt;
    private final String errorCode;
    private final String errorMessage;
    private final String engineSnapshot;
    private final String createdBy;
    private final String updatedBy;
    private final Instant updatedAt;

    public JobExecutionRecord(Long id, long instanceId, int attemptNo, String engineType, Long engineEndpointId, String externalJobId, JobExecutionStatus submissionStatus, JobExecutionStatus executionStatus, Instant createdAt, Instant submittingAt, Instant submittedAt, Instant startedAt, Instant cancellingAt, Instant canceledAt, Instant finishedAt, Instant lastSyncedAt, String errorCode, String errorMessage, String engineSnapshot, String createdBy, String updatedBy, Instant updatedAt) {
        if (instanceId <= 0) throw new IllegalArgumentException("instanceId must be positive");
        if (attemptNo <= 0) throw new IllegalArgumentException("attemptNo must be positive");
        engineType = require(engineType, "engineType");
        submissionStatus = Objects.requireNonNull(submissionStatus, "submissionStatus");
        executionStatus = Objects.requireNonNull(executionStatus, "executionStatus");
        this.id = id;
        this.instanceId = instanceId;
        this.attemptNo = attemptNo;
        this.engineType = engineType;
        this.engineEndpointId = engineEndpointId;
        this.externalJobId = externalJobId;
        this.submissionStatus = submissionStatus;
        this.executionStatus = executionStatus;
        this.createdAt = createdAt;
        this.submittingAt = submittingAt;
        this.submittedAt = submittedAt;
        this.startedAt = startedAt;
        this.cancellingAt = cancellingAt;
        this.canceledAt = canceledAt;
        this.finishedAt = finishedAt;
        this.lastSyncedAt = lastSyncedAt;
        this.errorCode = errorCode;
        this.errorMessage = errorMessage;
        this.engineSnapshot = engineSnapshot;
        this.createdBy = createdBy;
        this.updatedBy = updatedBy;
        this.updatedAt = updatedAt;
    }

    public Long id() { return id; }


    public Long getId() { return id; }

    public long instanceId() { return instanceId; }


    public long getInstanceId() { return instanceId; }

    public int attemptNo() { return attemptNo; }


    public int getAttemptNo() { return attemptNo; }

    public String engineType() { return engineType; }


    public String getEngineType() { return engineType; }

    public Long engineEndpointId() { return engineEndpointId; }


    public Long getEngineEndpointId() { return engineEndpointId; }

    public String externalJobId() { return externalJobId; }


    public String getExternalJobId() { return externalJobId; }

    public JobExecutionStatus submissionStatus() { return submissionStatus; }


    public JobExecutionStatus getSubmissionStatus() { return submissionStatus; }

    public JobExecutionStatus executionStatus() { return executionStatus; }


    public JobExecutionStatus getExecutionStatus() { return executionStatus; }

    public Instant createdAt() { return createdAt; }


    public Instant getCreatedAt() { return createdAt; }

    public Instant submittingAt() { return submittingAt; }


    public Instant getSubmittingAt() { return submittingAt; }

    public Instant submittedAt() { return submittedAt; }


    public Instant getSubmittedAt() { return submittedAt; }

    public Instant startedAt() { return startedAt; }


    public Instant getStartedAt() { return startedAt; }

    public Instant cancellingAt() { return cancellingAt; }


    public Instant getCancellingAt() { return cancellingAt; }

    public Instant canceledAt() { return canceledAt; }


    public Instant getCanceledAt() { return canceledAt; }

    public Instant finishedAt() { return finishedAt; }


    public Instant getFinishedAt() { return finishedAt; }

    public Instant lastSyncedAt() { return lastSyncedAt; }


    public Instant getLastSyncedAt() { return lastSyncedAt; }

    public String errorCode() { return errorCode; }


    public String getErrorCode() { return errorCode; }

    public String errorMessage() { return errorMessage; }


    public String getErrorMessage() { return errorMessage; }

    public String engineSnapshot() { return engineSnapshot; }


    public String getEngineSnapshot() { return engineSnapshot; }

    public String createdBy() { return createdBy; }


    public String getCreatedBy() { return createdBy; }

    public String updatedBy() { return updatedBy; }


    public String getUpdatedBy() { return updatedBy; }

    public Instant updatedAt() { return updatedAt; }


    public Instant getUpdatedAt() { return updatedAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        JobExecutionRecord that = (JobExecutionRecord) o;
        return java.util.Objects.equals(id, that.id) && instanceId == that.instanceId && attemptNo == that.attemptNo && java.util.Objects.equals(engineType, that.engineType) && java.util.Objects.equals(engineEndpointId, that.engineEndpointId) && java.util.Objects.equals(externalJobId, that.externalJobId) && java.util.Objects.equals(submissionStatus, that.submissionStatus) && java.util.Objects.equals(executionStatus, that.executionStatus) && java.util.Objects.equals(createdAt, that.createdAt) && java.util.Objects.equals(submittingAt, that.submittingAt) && java.util.Objects.equals(submittedAt, that.submittedAt) && java.util.Objects.equals(startedAt, that.startedAt) && java.util.Objects.equals(cancellingAt, that.cancellingAt) && java.util.Objects.equals(canceledAt, that.canceledAt) && java.util.Objects.equals(finishedAt, that.finishedAt) && java.util.Objects.equals(lastSyncedAt, that.lastSyncedAt) && java.util.Objects.equals(errorCode, that.errorCode) && java.util.Objects.equals(errorMessage, that.errorMessage) && java.util.Objects.equals(engineSnapshot, that.engineSnapshot) && java.util.Objects.equals(createdBy, that.createdBy) && java.util.Objects.equals(updatedBy, that.updatedBy) && java.util.Objects.equals(updatedAt, that.updatedAt);
    }

    @Override
    public int hashCode() { return java.util.Objects.hash(id, instanceId, attemptNo, engineType, engineEndpointId, externalJobId, submissionStatus, executionStatus, createdAt, submittingAt, submittedAt, startedAt, cancellingAt, canceledAt, finishedAt, lastSyncedAt, errorCode, errorMessage, engineSnapshot, createdBy, updatedBy, updatedAt); }

    @Override
    public String toString() {
        return "JobExecutionRecord[" + "id=" + id + ", " + "instanceId=" + instanceId + ", " + "attemptNo=" + attemptNo + ", " + "engineType=" + engineType + ", " + "engineEndpointId=" + engineEndpointId + ", " + "externalJobId=" + externalJobId + ", " + "submissionStatus=" + submissionStatus + ", " + "executionStatus=" + executionStatus + ", " + "createdAt=" + createdAt + ", " + "submittingAt=" + submittingAt + ", " + "submittedAt=" + submittedAt + ", " + "startedAt=" + startedAt + ", " + "cancellingAt=" + cancellingAt + ", " + "canceledAt=" + canceledAt + ", " + "finishedAt=" + finishedAt + ", " + "lastSyncedAt=" + lastSyncedAt + ", " + "errorCode=" + errorCode + ", " + "errorMessage=" + errorMessage + ", " + "engineSnapshot=" + engineSnapshot + ", " + "createdBy=" + createdBy + ", " + "updatedBy=" + updatedBy + ", " + "updatedAt=" + updatedAt + "]";
    }


    private static String require(String value, String name) {
        if (value == null || value.trim().isEmpty()) throw new IllegalArgumentException(name + " must not be blank");
        return value;
    }
}
