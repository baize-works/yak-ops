package io.yak.ops.domain.job;

import java.util.Optional;

public interface JobExecutionRepository {
    JobExecutionRecord save(JobExecutionRecord record);
    Optional<JobExecutionRecord> findByInstanceIdAndAttemptNo(long instanceId, int attemptNo);
    Optional<JobExecutionRecord> findByExternalJobId(String externalJobId);
}
