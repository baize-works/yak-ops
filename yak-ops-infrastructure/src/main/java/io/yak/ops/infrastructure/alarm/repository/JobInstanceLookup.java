package io.yak.ops.infrastructure.alarm.repository;

/**
 * Read-side lookup of basic job instance info, used to enrich alarm messages
 * when the status-change event does not carry the full context.
 *
 * <p>
 * Kept as a narrow interface so the alarm engine can be unit-tested with an
 * in-memory implementation.
 * </p>
 */
public interface JobInstanceLookup {

    JobInstanceBasic lookup(Long jobInstanceId);
}
