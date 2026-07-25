package io.yak.ops.domain.job;

import java.time.Clock;
import java.time.Instant;
import java.util.Objects;

/** Applies monotonic lifecycle transitions while preserving the execution audit history. */
public final class UpdateJobExecutionStatusService {
    private final JobExecutionRepository repository; private final Clock clock;
    public UpdateJobExecutionStatusService(JobExecutionRepository repository, Clock clock) { this.repository = Objects.requireNonNull(repository); this.clock = Objects.requireNonNull(clock); }
    public JobExecutionRecord update(long instanceId, int attemptNo, JobExecutionStatus submission, JobExecutionStatus execution,
            String externalJobId, String errorCode, String errorMessage, String snapshot, String actor) {
        JobExecutionRecord previous = repository.findByInstanceIdAndAttemptNo(instanceId, attemptNo).orElseThrow(() -> new IllegalArgumentException("Execution attempt not found"));
        if (previous.executionStatus().isTerminal() && execution != previous.executionStatus()) throw new IllegalStateException("Terminal execution cannot transition");
        Instant now = clock.instant();
        return repository.save(new JobExecutionRecord(previous.id(), instanceId, attemptNo, previous.engineType(), previous.engineEndpointId(),
                externalJobId == null ? previous.externalJobId() : externalJobId, submission, execution, previous.createdAt(),
                first(previous.submittingAt(), submission == JobExecutionStatus.SUBMITTING, now), first(previous.submittedAt(), submission == JobExecutionStatus.SUBMITTED, now),
                first(previous.startedAt(), execution == JobExecutionStatus.RUNNING, now), first(previous.cancellingAt(), execution == JobExecutionStatus.CANCELLING, now),
                first(previous.canceledAt(), execution == JobExecutionStatus.CANCELED, now), first(previous.finishedAt(), execution.isTerminal(), now), now,
                errorCode, errorMessage, snapshot, previous.createdBy(), actor, now));
    }
    private static Instant first(Instant existing, boolean condition, Instant now) { return existing == null && condition ? now : existing; }
}
