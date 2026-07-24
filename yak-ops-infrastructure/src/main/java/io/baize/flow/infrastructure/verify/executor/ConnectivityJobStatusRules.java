package io.baize.flow.infrastructure.verify.executor;

import io.baize.flow.domain.enums.JobStatus;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/**
 * Centralized status rules for connectivity test jobs.
 */
@Component
public class ConnectivityJobStatusRules {

    /** Statuses that mean the connectivity check can be treated as successful. */
    private static final Set<JobStatus> VERIFY_SUCCESS_STATUSES = Collections.unmodifiableSet(
            new HashSet<JobStatus>(Arrays.asList(
                    JobStatus.RUNNING,
                    JobStatus.FINISHED,
                    JobStatus.SAVEPOINT_DONE
            ))
    );

    /** Statuses that mean the connectivity check has failed. */
    private static final Set<JobStatus> VERIFY_FAIL_STATUSES = Collections.unmodifiableSet(
            new HashSet<JobStatus>(Arrays.asList(
                    JobStatus.FAILED,
                    JobStatus.CANCELED,
                    JobStatus.UNKNOWABLE
            ))
    );

    /** Statuses that indicate the test job is still active. */
    private static final Set<JobStatus> ACTIVE_STATUSES = Collections.unmodifiableSet(
            new HashSet<JobStatus>(Arrays.asList(
                    JobStatus.INITIALIZING,
                    JobStatus.CREATED,
                    JobStatus.PENDING,
                    JobStatus.SCHEDULED,
                    JobStatus.RUNNING,
                    JobStatus.FAILING,
                    JobStatus.DOING_SAVEPOINT,
                    JobStatus.CANCELING
            ))
    );

    public boolean isVerifySuccess(JobStatus status) {
        return status != null && VERIFY_SUCCESS_STATUSES.contains(status);
    }

    public boolean isVerifyFail(JobStatus status) {
        return status != null && VERIFY_FAIL_STATUSES.contains(status);
    }

    public boolean isActive(JobStatus status) {
        return status != null && ACTIVE_STATUSES.contains(status);
    }

    public boolean isVerifiable(JobStatus status) {
        return isVerifySuccess(status) || isVerifyFail(status);
    }

    public boolean isTerminal(JobStatus status) {
        return status != null && status.isEndState();
    }
}