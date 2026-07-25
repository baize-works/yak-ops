package io.yak.ops.domain.job;

/** Lifecycle shared by every Yak Ops engine adapter. */
public enum JobExecutionStatus {
    CREATED, SUBMITTING, SUBMITTED, RUNNING, CANCELLING, CANCELED, SUCCEEDED, FAILED, UNKNOWN;

    public boolean isTerminal() {
        return this == CANCELED || this == SUCCEEDED || this == FAILED;
    }
}
