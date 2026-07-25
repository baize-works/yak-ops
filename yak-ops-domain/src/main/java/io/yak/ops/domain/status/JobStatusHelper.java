package io.yak.ops.domain.status;

import io.yak.ops.domain.enums.JobStatus;

import io.yak.ops.domain.enums.JobStatus;

import java.util.Arrays;
import java.util.List;

public final class JobStatusHelper {

    private JobStatusHelper() {
    }

    public static List<JobStatus> runningLikeStatuses() {
        return Arrays.asList(
                JobStatus.INITIALIZING,
                JobStatus.CREATED,
                JobStatus.PENDING,
                JobStatus.SCHEDULED,
                JobStatus.RUNNING,
                JobStatus.FAILING,
                JobStatus.DOING_SAVEPOINT,
                JobStatus.CANCELING
        );
    }
}
