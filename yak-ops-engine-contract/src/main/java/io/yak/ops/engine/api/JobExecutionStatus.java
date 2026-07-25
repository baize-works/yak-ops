package io.yak.ops.engine.api;

/** Vendor-neutral engine execution lifecycle. */
public enum JobExecutionStatus {
    CREATED, SUBMITTING, SUBMITTED, RUNNING, CANCELLING, CANCELED, SUCCEEDED, FAILED, UNKNOWN;
    public boolean terminal() { return this == CANCELED || this == SUCCEEDED || this == FAILED; }
}
