package io.yak.ops.domain.job;

import static org.junit.jupiter.api.Assertions.*;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class JobExecutionStatusServiceTest {
    private final MemoryRepository repository = new MemoryRepository();
    private final Clock clock = Clock.fixed(Instant.parse("2026-01-02T03:04:05Z"), ZoneOffset.UTC);
    @Test void records_submission_and_running_failure_with_timestamps() {
        new CreateJobExecutionService(repository, clock).create(1, 1, "test-engine", 2L, "system");
        UpdateJobExecutionStatusService service = new UpdateJobExecutionStatusService(repository, clock);
        service.update(1, 1, JobExecutionStatus.SUBMITTED, JobExecutionStatus.SUBMITTED, "job-a", null, null, "{}", "system");
        JobExecutionRecord result = service.update(1, 1, JobExecutionStatus.SUBMITTED, JobExecutionStatus.FAILED, "job-a", "ENGINE_FAILED", "boom", "{}", "system");
        assertEquals(JobExecutionStatus.FAILED, result.executionStatus()); assertNotNull(result.submittedAt()); assertNotNull(result.finishedAt());
    }
    @Test void handles_submit_failure_cancel_lifecycle_unreachable_unknown_and_restart_recovery() {
        CreateJobExecutionService create = new CreateJobExecutionService(repository, clock); UpdateJobExecutionStatusService service = new UpdateJobExecutionStatusService(repository, clock);
        create.create(2, 1, "test-engine", null, "system");
        assertEquals(JobExecutionStatus.FAILED, service.update(2, 1, JobExecutionStatus.FAILED, JobExecutionStatus.FAILED, null, "SUBMIT_FAILED", "no", null, "system").executionStatus());
        create.create(3, 1, "test-engine", null, "system"); service.update(3, 1, JobExecutionStatus.SUBMITTED, JobExecutionStatus.CANCELLING, "job-c", null, null, null, "system");
        assertEquals(JobExecutionStatus.CANCELED, service.update(3, 1, JobExecutionStatus.SUBMITTED, JobExecutionStatus.CANCELED, "job-c", null, null, null, "system").executionStatus());
        create.create(4, 1, "test-engine", null, "system");
        assertEquals(JobExecutionStatus.UNKNOWN, service.update(4, 1, JobExecutionStatus.SUBMITTED, JobExecutionStatus.UNKNOWN, "job-u", "UNREACHABLE", null, null, "recovery").executionStatus());
        assertEquals(JobExecutionStatus.RUNNING, service.update(4, 1, JobExecutionStatus.SUBMITTED, JobExecutionStatus.RUNNING, "job-u", null, null, null, "recovery").executionStatus());
    }
    private static final class MemoryRepository implements JobExecutionRepository {
        private final Map<String, JobExecutionRecord> records = new HashMap<>(); private long id;
        public JobExecutionRecord save(JobExecutionRecord r) { JobExecutionRecord saved = r.id() == null ? new JobExecutionRecord(++id,r.instanceId(),r.attemptNo(),r.engineType(),r.engineEndpointId(),r.externalJobId(),r.submissionStatus(),r.executionStatus(),r.createdAt(),r.submittingAt(),r.submittedAt(),r.startedAt(),r.cancellingAt(),r.canceledAt(),r.finishedAt(),r.lastSyncedAt(),r.errorCode(),r.errorMessage(),r.engineSnapshot(),r.createdBy(),r.updatedBy(),r.updatedAt()) : r; records.put(key(r.instanceId(),r.attemptNo()),saved); return saved; }
        public Optional<JobExecutionRecord> findByInstanceIdAndAttemptNo(long instance, int attempt) { return Optional.ofNullable(records.get(key(instance,attempt))); }
        public Optional<JobExecutionRecord> findByExternalJobId(String external) { return records.values().stream().filter(r -> external.equals(r.externalJobId())).findFirst(); }
        private static String key(long instance,int attempt) { return instance+":"+attempt; }
    }
}
