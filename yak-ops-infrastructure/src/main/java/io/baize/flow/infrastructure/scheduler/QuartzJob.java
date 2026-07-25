package io.baize.flow.infrastructure.scheduler;

import lombok.extern.slf4j.Slf4j;
import io.baize.flow.application.service.application.job.ExecuteJobUseCase;
import io.baize.flow.application.service.JobScheduleService;
import io.baize.flow.domain.enums.JobSubmitStage;
import io.baize.flow.domain.enums.RunMode;
import io.baize.flow.domain.exception.JobSubmitException;
import org.quartz.Job;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.springframework.stereotype.Component;

import java.net.ConnectException;
import java.sql.SQLTransientConnectionException;
import java.util.Date;

@Slf4j
@Component
public class QuartzJob implements Job {

    private static final String KEY_JOB_DEFINITION_ID = "jobDefinitionId";
    private static final String KEY_JOB_SCHEDULE_ID = "jobScheduleId";

    private final JobScheduleService scheduleService;
    private final ExecuteJobUseCase executeJobUseCase;

    public QuartzJob(JobScheduleService scheduleService,
                     ExecuteJobUseCase executeJobUseCase) {
        this.scheduleService = scheduleService;
        this.executeJobUseCase = executeJobUseCase;
    }

    @Override
    public void execute(JobExecutionContext context) throws JobExecutionException {
        Long jobDefineId = context.getMergedJobDataMap().getLong(KEY_JOB_DEFINITION_ID);
        Long scheduleId = context.getMergedJobDataMap().getLong(KEY_JOB_SCHEDULE_ID);

        logExecutionContext(context);

        try {
            Long instanceId = executeJobUseCase.execute(jobDefineId, RunMode.SCHEDULED);

            log.info("Quartz fire: jobDefineId={}, instanceId={}, scheduleId={}, fireTime={}",
                    jobDefineId, instanceId, scheduleId, context.getFireTime());

            updateLastScheduleTimeSafely(scheduleId);
            updateNextScheduleTimeSafely(context, scheduleId);

        } catch (Exception e) {
            boolean refire = shouldRefire(e);

            log.error("Quartz job failed: jobDefineId={}, scheduleId={}, refire={}",
                    jobDefineId, scheduleId, refire, e);

            JobExecutionException jee = new JobExecutionException(e);
            jee.setRefireImmediately(false);
            throw jee;
        }
    }

    private void updateLastScheduleTimeSafely(Long scheduleId) {
        try {
            scheduleService.updateLastScheduleTime(scheduleId);
            log.debug("Updated lastScheduleTime: scheduleId={}", scheduleId);
        } catch (Exception e) {
            log.warn("Update lastScheduleTime failed: scheduleId={}", scheduleId, e);
        }
    }

    private void updateNextScheduleTimeSafely(JobExecutionContext context, Long scheduleId) {
        try {
            Date next = context.getNextFireTime();
            if (next != null) {
                scheduleService.updateNextScheduleTime(scheduleId, next);
                log.debug("Updated nextScheduleTime: scheduleId={}, nextFireTime={}", scheduleId, next);
            }
        } catch (Exception e) {
            log.warn("Update nextScheduleTime failed: scheduleId={}", scheduleId, e);
        }
    }

    private boolean shouldRefire(Throwable e) {
        if (containsSubmitPostStage(e)) {
            return false;
        }

        return hasCause(e, ConnectException.class)
                || hasCause(e, SQLTransientConnectionException.class)
                || hasCause(e, org.springframework.dao.TransientDataAccessResourceException.class)
                || hasCause(e, org.springframework.web.client.ResourceAccessException.class); // RestTemplate I/O
    }

    private boolean containsSubmitPostStage(Throwable e) {
        Throwable cur = e;
        while (cur != null) {
            if (cur instanceof JobSubmitException) {
                JobSubmitException jse =
                        (JobSubmitException) cur;
                return jse.getStage() == JobSubmitStage.POST_SUBMIT;
            }
            cur = cur.getCause();
        }
        return false;
    }

    private boolean hasCause(Throwable e, Class<? extends Throwable> type) {
        Throwable cur = e;
        while (cur != null) {
            if (type.isInstance(cur)) return true;
            cur = cur.getCause();
        }
        return false;
    }

    private void logExecutionContext(JobExecutionContext context) {
        if (!log.isDebugEnabled()) return;
        log.debug("Quartz ctx: fireTime={}, nextFireTime={}, scheduledFireTime={}, jobRunTime={}ms",
                context.getFireTime(),
                context.getNextFireTime(),
                context.getScheduledFireTime(),
                context.getJobRunTime());
    }
}
