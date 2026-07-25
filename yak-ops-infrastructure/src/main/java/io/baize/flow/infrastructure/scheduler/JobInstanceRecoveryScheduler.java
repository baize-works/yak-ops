package io.baize.flow.infrastructure.scheduler;

import javax.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import io.baize.flow.application.service.application.job.SynchronizeJobStatusUseCase;
import io.baize.flow.dao.entity.JobInstance;
import io.baize.flow.dao.repository.JobInstanceDao;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Recover local job instance status after Yak Ops restart.
 *
 * <p>
 * When Yak Ops is stopped or restarted, in-memory watchers are lost.
 * Some local job instances may remain RUNNING even though the corresponding
 * Zeta job has already finished.
 * </p>
 */
@Slf4j
@Component
public class JobInstanceRecoveryScheduler {

    @Resource
    private JobInstanceDao jobInstanceDao;


    @Resource
    private SynchronizeJobStatusUseCase synchronizeJobStatusUseCase;

    @Value("${seatunnel.job.recovery.enabled:true}")
    private boolean enabled;

    @EventListener(ApplicationReadyEvent.class)
    public void recoverOnStartup() {
        if (!enabled) {
            return;
        }

        log.info("Start recovering running job instances after Yak Ops startup");

        recoverBatchInstances();

        log.info("Recover running job instances after Yak Ops startup finished");
    }

    @Scheduled(
            initialDelayString = "${seatunnel.job.recovery.initial-delay-ms:60000}",
            fixedDelayString = "${seatunnel.job.recovery.fixed-delay-ms:60000}"
    )
    public void recoverPeriodically() {
        if (!enabled) {
            return;
        }

        recoverBatchInstances();
    }

    private void recoverBatchInstances() {
        List<JobInstance> instances = jobInstanceDao.listRunningLikeInstances();
        if (instances == null || instances.isEmpty()) {
            return;
        }

        log.info("Start recovering batch running-like instances, count={}", instances.size());

        for (JobInstance instance : instances) {
            try {
                recoverBatchInstance(instance);
            } catch (Exception e) {
                log.warn(
                        "Recover batch job instance failed, instanceId={}, engineJobId={}",
                        instance == null ? null : instance.getId(),
                        instance == null ? null : instance.getEngineJobId(),
                        e
                );
            }
        }
    }


    private void recoverBatchInstance(JobInstance instance) {
        if (instance == null || instance.getId() == null || instance.getEngineJobId() == null) return;
        synchronizeJobStatusUseCase.synchronize(instance.getId());
    }


}
