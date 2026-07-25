package io.yak.ops.infrastructure.verify.executor;

import io.yak.ops.infrastructure.verify.job.ConnectivityTestJob;
import io.yak.ops.dao.entity.LinkUpClient;

/**
 * Execute a LinkUp test job and wait for the final result.
 */
public interface LinkUpTestJobExecutor {

    /**
     * Submit the test job and wait until it finishes or times out.
     */
    JobExecutionResult executeAndWait(
            LinkUpClient client,
            ConnectivityTestJob job,
            long timeoutMs,
            long pollIntervalMs
    );
}
