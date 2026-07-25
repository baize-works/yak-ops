package io.baize.flow.infrastructure.metrics;

import javax.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import io.baize.flow.domain.enums.JobStatus;
import io.baize.flow.engine.legacy.LegacyRestClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Watch SeaTunnel batch job result by REST polling.
 *
 * <p>
 * This watcher only detects the final Zeta job status.
 * Local status update and final metrics persistence are delegated to
 * JobResultHandler.
 * </p>
 */
@Component
@Slf4j
public class JobResultWatcher {

    private final ExecutorService executor = Executors.newCachedThreadPool();

    @Resource
    private JobResultHandler resultHandler;

    @Resource
    private LegacyRestClient seatunnelRestClient;

    @Value("${seatunnel.result.poll-interval-ms:2000}")
    private long pollIntervalMs;

    @Value("${seatunnel.result.poll-timeout-ms:0}")
    private long pollTimeoutMs;

    public void registerByRest(final JobRuntimeContext context) {
        if (context == null) {
            log.warn("Skip registering REST job result watcher because context is null");
            return;
        }

        executor.submit(new Runnable() {
            @Override
            public void run() {
                watch(context);
            }
        });
    }

    private void watch(JobRuntimeContext context) {
        long start = System.currentTimeMillis();

        Long instanceId = context.getInstanceId();
        Long clientId = context.getClientId();
        String engineId = context.getEngineId();

        try {
            validateContext(context);

            while (true) {
                checkTimeout(start, engineId);

                Map jobInfo = seatunnelRestClient.jobInfo(clientId, engineId);
                String statusStr = readStatus(jobInfo);

                if (StringUtils.isBlank(statusStr)) {
                    log.warn(
                            "Zeta job-info returned no status, instanceId={}, clientId={}, engineId={}, resp={}",
                            instanceId,
                            clientId,
                            engineId,
                            jobInfo
                    );

                    sleepQuietly();
                    continue;
                }

                JobStatus status = parseJobStatus(statusStr);

                log.debug(
                        "Polling Zeta job status, instanceId={}, clientId={}, engineId={}, engineStatus={}, localStatus={}",
                        instanceId,
                        clientId,
                        engineId,
                        statusStr,
                        status
                );

                if (!status.isEndState()) {
                    sleepQuietly();
                    continue;
                }

                handleFinalStatus(instanceId, status, jobInfo);
                return;
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();

            log.warn(
                    "REST job result watcher interrupted, instanceId={}, clientId={}, engineId={}",
                    instanceId,
                    clientId,
                    engineId,
                    e
            );

            resultHandler.handleFailure(instanceId, e);
        } catch (Exception e) {
            log.warn(
                    "REST job result watcher failed, instanceId={}, clientId={}, engineId={}",
                    instanceId,
                    clientId,
                    engineId,
                    e
            );

            resultHandler.handleFailure(instanceId, e);
        } finally {
            log.info(
                    "REST job result watcher finished, instanceId={}, clientId={}, engineId={}",
                    instanceId,
                    clientId,
                    engineId
            );
        }
    }

    private void handleFinalStatus(Long instanceId,
                                   JobStatus status,
                                   Map jobInfo) {
        String errorMessage = JobStatus.FINISHED.equals(status)
                ? null
                : readErrorMsg(jobInfo);

        resultHandler.handleFinalStatus(instanceId, status, errorMessage);
    }

    private void validateContext(JobRuntimeContext context) {
        if (context.getInstanceId() == null || context.getInstanceId() <= 0) {
            throw new IllegalArgumentException("instanceId must not be null");
        }

        if (context.getClientId() == null || context.getClientId() <= 0) {
            throw new IllegalArgumentException("clientId must not be null");
        }

        if (context.getEngineId() == null) {
            throw new IllegalArgumentException("engineId must not be null");
        }
    }

    private void checkTimeout(long start, String engineId) {
        if (pollTimeoutMs <= 0) {
            return;
        }

        long cost = System.currentTimeMillis() - start;
        if (cost > pollTimeoutMs) {
            throw new IllegalStateException("Polling job-info timeout, engineId=" + engineId);
        }
    }

    private String readStatus(Map jobInfo) {
        if (jobInfo == null || jobInfo.isEmpty()) {
            return null;
        }

        Object status = firstNonNull(
                jobInfo.get("jobStatus"),
                jobInfo.get("job_status"),
                jobInfo.get("status"),
                jobInfo.get("state"),
                jobInfo.get("jobState")
        );

        if (status == null) {
            return null;
        }

        String value = String.valueOf(status);
        if (StringUtils.isBlank(value) || "null".equalsIgnoreCase(value.trim())) {
            return null;
        }

        return value.trim();
    }

    private String readErrorMsg(Map jobInfo) {
        if (jobInfo == null || jobInfo.isEmpty()) {
            return null;
        }

        Object errorMsg = firstNonNull(
                jobInfo.get("errorMsg"),
                jobInfo.get("error_msg"),
                jobInfo.get("errorMessage"),
                jobInfo.get("message"),
                jobInfo.get("exception"),
                jobInfo.get("cause")
        );

        if (errorMsg == null) {
            return null;
        }

        String value = String.valueOf(errorMsg);
        if (StringUtils.isBlank(value) || "null".equalsIgnoreCase(value.trim())) {
            return null;
        }

        return value.trim();
    }

    private Object firstNonNull(Object... values) {
        if (values == null) {
            return null;
        }

        for (Object value : values) {
            if (value != null) {
                return value;
            }
        }

        return null;
    }

    private void sleepQuietly() throws InterruptedException {
        Thread.sleep(pollIntervalMs);
    }

    private JobStatus parseJobStatus(String value) {
        if (StringUtils.isBlank(value)) {
            return JobStatus.UNKNOWABLE;
        }

        String normalized = value.trim().toUpperCase();

        if ("SUCCESS".equals(normalized)
                || "SUCCEEDED".equals(normalized)
                || "DONE".equals(normalized)) {
            return JobStatus.FINISHED;
        }

        if ("FAILURE".equals(normalized)) {
            return JobStatus.FAILED;
        }

        if ("CANCELLED".equals(normalized)
                || "STOPPED".equals(normalized)) {
            return JobStatus.CANCELED;
        }

        try {
            return JobStatus.valueOf(normalized);
        } catch (Exception e) {
            log.warn("Unknown Zeta job status: {}", value);
            return JobStatus.UNKNOWABLE;
        }
    }
}
