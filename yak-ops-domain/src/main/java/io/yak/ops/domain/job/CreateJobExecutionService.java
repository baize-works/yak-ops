package io.yak.ops.domain.job;

import java.time.Clock;
import java.time.Instant;
import java.util.Objects;

public final class CreateJobExecutionService {
    private final JobExecutionRepository repository;
    private final Clock clock;
    public CreateJobExecutionService(JobExecutionRepository repository, Clock clock) {
        this.repository = Objects.requireNonNull(repository); this.clock = Objects.requireNonNull(clock);
    }
    public JobExecutionRecord create(long instanceId, int attemptNo, String engineType, Long endpointId, String actor) {
        if (repository.findByInstanceIdAndAttemptNo(instanceId, attemptNo).isPresent())
            throw new IllegalStateException("Execution attempt already exists");
        Instant now = clock.instant();
        return repository.save(new JobExecutionRecord(null, instanceId, attemptNo, engineType, endpointId, null,
                JobExecutionStatus.CREATED, JobExecutionStatus.CREATED, now, null, null, null, null, null,
                null, null, null, null, null, actor, actor, now));
    }
}
