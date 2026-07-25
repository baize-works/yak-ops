package io.yak.ops.infrastructure.verify.executor;

import io.yak.ops.infrastructure.verify.job.ConnectivityTestJob;
import io.yak.ops.dao.entity.SeaTunnelClient;

/**
 * Execute a SeaTunnel test job and wait for the final result.
 */
public interface SeaTunnelTestJobExecutor {

    /**
     * Submit the test job and wait until it finishes or times out.
     */
    JobExecutionResult executeAndWait(
            SeaTunnelClient client,
            ConnectivityTestJob job,
            long timeoutMs,
            long pollIntervalMs
    );
}
