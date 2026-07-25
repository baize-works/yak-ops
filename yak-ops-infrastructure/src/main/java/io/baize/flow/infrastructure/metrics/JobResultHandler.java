package io.baize.flow.infrastructure.metrics;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import io.baize.flow.infrastructure.alarm.event.JobStatusChangedEvent;
import io.baize.flow.application.service.BatchJobInstanceService;
import io.baize.flow.application.support.job.JobUtils;
import io.baize.flow.common.enums.JobResult;
import io.baize.flow.domain.enums.JobStatus;
import io.baize.flow.dao.entity.JobInstance;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.util.Date;

/**
 * Handler responsible for processing SeaTunnel batch job execution results.
 *
 * <p>
 * It centralizes final status processing:
 * 1. Update local job instance status.
 * 2. Set end time.
 * 3. Persist error message if needed.
 * 4. Finalize and persist final metrics.
 * </p>
 */
@Component
@Slf4j
public class JobResultHandler {

    private final BatchJobInstanceService instanceService;

    private final JobMetricsMonitor jobMetricsMonitor;

    private final ApplicationEventPublisher eventPublisher;

    public JobResultHandler(BatchJobInstanceService instanceService,
                            JobMetricsMonitor jobMetricsMonitor,
                            ApplicationEventPublisher eventPublisher) {
        this.instanceService = instanceService;
        this.jobMetricsMonitor = jobMetricsMonitor;
        this.eventPublisher = eventPublisher;
    }

    /**
     * Handle successful job completion.
     *
     * @param jobInstanceId job instance id
     */
    public void handleSuccess(Long jobInstanceId) {
        handleFinalStatus(jobInstanceId, JobStatus.FINISHED, null);
        log.info("Job completed successfully. instanceId={}", jobInstanceId);
    }

    /**
     * Handle job failure caused by exception.
     *
     * @param jobInstanceId job instance id
     * @param error         exception
     */
    public void handleFailure(Long jobInstanceId, Throwable error) {
        String message = buildThrowableMessage(error);

        handleFinalStatus(jobInstanceId, JobStatus.FAILED, message);

        log.error("Job failed. instanceId={}, error={}", jobInstanceId, message, error);
    }

    /**
     * Handle job failure based on engine job result.
     *
     * @param jobInstanceId job instance id
     * @param jobResult     engine result
     */
    public void handleFailure(Long jobInstanceId, JobResult jobResult) {
        JobStatus engineStatus = jobResult == null ? JobStatus.FAILED : jobResult.getStatus();
        String message = jobResult == null ? "Unknown error" : jobResult.getError();

        handleFinalStatus(jobInstanceId, engineStatus, message);

        log.error(
                "Job failed. instanceId={}, status={}, error={}",
                jobInstanceId,
                engineStatus,
                message
        );
    }

    /**
     * Handle final status in normal watcher mode.
     *
     * <p>
     * This method depends on JobMetricsMonitor internal monitoringJobs map.
     * It is suitable for normal submit -> monitor -> watcher flow.
     * </p>
     *
     * @param jobInstanceId job instance id
     * @param engineStatus  final status returned by engine
     * @param errorMessage  error message
     */
    public void handleFinalStatus(Long jobInstanceId,
                                  JobStatus engineStatus,
                                  String errorMessage) {
        if (jobInstanceId == null || jobInstanceId <= 0) {
            log.warn("Skip handling final status because jobInstanceId is invalid, jobInstanceId={}",
                    jobInstanceId);
            return;
        }

        JobStatus localStatus = normalizeFinalStatus(engineStatus);
        String metricsStatus = resolveMetricsStatus(engineStatus, localStatus);

        updateStatus(jobInstanceId, localStatus, errorMessage);

        try {
            jobMetricsMonitor.finalizeAndPersist(jobInstanceId, metricsStatus);
        } catch (Exception e) {
            log.warn(
                    "Finalize batch metrics failed, instanceId={}, metricsStatus={}",
                    jobInstanceId,
                    metricsStatus,
                    e
            );
        }
    }

    /**
     * Handle final status in recovery mode.
     *
     * <p>
     * This method does not depend on JobMetricsMonitor internal monitoringJobs map.
     * It is mainly used after Yak Ops restart. Recovery logic can rebuild
     * JobRuntimeContext from database instance data and call this method directly.
     * </p>
     *
     * @param context      runtime context rebuilt from persisted instance
     * @param engineStatus final status returned by engine
     * @param errorMessage error message
     */
    public void handleFinalStatus(JobRuntimeContext context,
                                  JobStatus engineStatus,
                                  String errorMessage) {
        if (context == null || context.getInstanceId() == null || context.getInstanceId() <= 0) {
            log.warn("Skip handling final status because runtime context is invalid, context={}",
                    context);
            return;
        }

        Long jobInstanceId = context.getInstanceId();

        JobStatus localStatus = normalizeFinalStatus(engineStatus);
        String metricsStatus = resolveMetricsStatus(engineStatus, localStatus);

        updateStatus(jobInstanceId, localStatus, errorMessage);

        try {
            jobMetricsMonitor.finalizeAndPersist(context, metricsStatus);
        } catch (Exception e) {
            log.warn(
                    "Finalize batch metrics with context failed, instanceId={}, engineId={}, metricsStatus={}",
                    jobInstanceId,
                    context.getEngineId(),
                    metricsStatus,
                    e
            );
        }
    }

    /**
     * Update engine job id after successful submission.
     *
     * @param instanceId job instance id
     * @param engineId   engine job id
     */
    public void updateEngineId(Long instanceId, String engineId) {
        if (instanceId == null || instanceId <= 0) {
            log.warn("Skip updating engineId because instanceId is invalid, instanceId={}", instanceId);
            return;
        }

        JobInstance po = new JobInstance();
        po.setId(instanceId);
        po.setEngineJobId(engineId);

        instanceService.updateById(po);

        log.info("Job submitted. instanceId={}, engineId={}", instanceId, engineId);
    }

    private void updateStatus(Long jobInstanceId,
                              JobStatus status,
                              String errorMessage) {
        JobInstance po = new JobInstance();
        po.setId(jobInstanceId);
        po.setJobStatus(status);
        po.setEndTime(new Date());

        /*
         * FINISHED is normal success, do not write error_message.
         * FAILED / CANCELED should keep the reason as much as possible.
         */
        if (!JobStatus.FINISHED.equals(status)) {
            po.setErrorMessage(normalizeErrorMessage(errorMessage));
        }

        instanceService.updateById(po);

        // Publish a status-change event so the alarm sub-system (and any other
        // listener) can react. oldStatus / engineJobId are unknown here; the
        // alarm engine enriches them via JobInstanceLookup.
        try {
            eventPublisher.publishEvent(new JobStatusChangedEvent(
                    this, jobInstanceId, null, status, null,
                    errorMessage, null));
        } catch (Exception e) {
            log.warn("Publish job status change event failed, instanceId={}", jobInstanceId, e);
        }

        log.info(
                "Batch job instance final status updated, instanceId={}, status={}, errorMessage={}",
                jobInstanceId,
                status,
                errorMessage
        );
    }

    private JobStatus normalizeFinalStatus(JobStatus engineStatus) {
        if (engineStatus == null) {
            return JobStatus.FAILED;
        }

        if (JobStatus.FINISHED.equals(engineStatus)) {
            return JobStatus.FINISHED;
        }

        if (JobStatus.CANCELED.equals(engineStatus)) {
            return JobStatus.CANCELED;
        }

        return JobStatus.FAILED;
    }

    private String resolveMetricsStatus(JobStatus engineStatus, JobStatus localStatus) {
        if (engineStatus != null) {
            return engineStatus.name();
        }

        if (localStatus != null) {
            return localStatus.name();
        }

        return JobStatus.FAILED.name();
    }

    private String buildThrowableMessage(Throwable error) {
        if (error == null) {
            return "Unknown error";
        }

        String message = error.getMessage();
        if (StringUtils.isBlank(message)) {
            return error.getClass().getSimpleName();
        }

        return JobUtils.getJobInstanceErrorMessage(message);
    }

    private String normalizeErrorMessage(String errorMessage) {
        if (StringUtils.isBlank(errorMessage)) {
            return "Unknown error";
        }

        return JobUtils.getJobInstanceErrorMessage(errorMessage);
    }
}
