package io.yak.ops.business.workflow.schedule;

import io.yak.ops.business.workflow.config.ConditionalOnWorkflowEnabled;
import io.yak.ops.business.workflow.model.WorkflowEnums.MisfirePolicy;
import io.yak.ops.business.workflow.model.WorkflowEnums.ScheduleConcurrencyPolicy;
import io.yak.ops.business.workflow.model.WorkflowRecords.Schedule;
import io.yak.ops.business.workflow.repository.JdbcWorkflowRepository;
import java.time.ZoneId;
import java.util.List;
import java.util.TimeZone;
import org.quartz.CronExpression;
import org.quartz.CronScheduleBuilder;
import org.quartz.CronTrigger;
import org.quartz.JobBuilder;
import org.quartz.JobDetail;
import org.quartz.JobKey;
import org.quartz.Scheduler;
import org.quartz.SchedulerException;
import org.quartz.TriggerBuilder;
import org.quartz.TriggerKey;
import org.springframework.context.event.EventListener;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Persists workflow schedules and mirrors them into the local Quartz scheduler. */
@ConditionalOnWorkflowEnabled
@Service
public final class WorkflowScheduleService {

  private static final String GROUP = "yak-workflow";

  private final JdbcWorkflowRepository repository;
  private final Scheduler scheduler;

  public WorkflowScheduleService(JdbcWorkflowRepository repository, Scheduler scheduler) {
    this.repository = repository;
    this.scheduler = scheduler;
  }

  @Transactional(transactionManager = "workflowTransactionManager")
  public Schedule upsert(
      long workflowId,
      String cronExpression,
      String timezone,
      boolean enabled,
      MisfirePolicy misfirePolicy,
      ScheduleConcurrencyPolicy concurrencyPolicy) {
    repository.findDefinition(workflowId)
        .orElseThrow(() -> new IllegalArgumentException(
            "Workflow definition does not exist: " + workflowId));
    validate(cronExpression, timezone);
    Schedule schedule = repository.upsertSchedule(
        workflowId,
        cronExpression,
        timezone,
        enabled,
        misfirePolicy == null ? MisfirePolicy.DO_NOTHING : misfirePolicy,
        concurrencyPolicy == null ? ScheduleConcurrencyPolicy.SKIP_IF_RUNNING : concurrencyPolicy);
    synchronize(schedule);
    return schedule;
  }

  @Transactional(transactionManager = "workflowTransactionManager")
  public void delete(long workflowId) {
    repository.deleteSchedule(workflowId);
    try {
      scheduler.deleteJob(jobKey(workflowId));
    } catch (SchedulerException error) {
      throw new IllegalStateException("Cannot delete workflow Quartz job", error);
    }
  }

  public Schedule get(long workflowId) {
    return repository.findSchedule(workflowId)
        .orElseThrow(() -> new IllegalArgumentException(
            "Workflow schedule does not exist: " + workflowId));
  }

  @EventListener(ApplicationReadyEvent.class)
  public void synchronizeEnabledSchedules() {
    List<Schedule> schedules = repository.findEnabledSchedules();
    for (Schedule schedule : schedules) {
      synchronize(schedule);
    }
  }

  private void synchronize(Schedule schedule) {
    try {
      JobKey jobKey = jobKey(schedule.workflowId());
      if (!schedule.enabled()) {
        scheduler.deleteJob(jobKey);
        return;
      }
      JobDetail job = JobBuilder.newJob(WorkflowQuartzJob.class)
          .withIdentity(jobKey)
          .usingJobData(WorkflowQuartzJob.WORKFLOW_ID_KEY, schedule.workflowId())
          .storeDurably(false)
          .build();
      CronScheduleBuilder cron = CronScheduleBuilder
          .cronSchedule(schedule.cronExpression())
          .inTimeZone(TimeZone.getTimeZone(ZoneId.of(schedule.timezone())));
      cron = schedule.misfirePolicy() == MisfirePolicy.FIRE_NOW
          ? cron.withMisfireHandlingInstructionFireAndProceed()
          : cron.withMisfireHandlingInstructionDoNothing();
      CronTrigger trigger = TriggerBuilder.newTrigger()
          .withIdentity(triggerKey(schedule.workflowId()))
          .forJob(job)
          .withSchedule(cron)
          .build();
      scheduler.scheduleJob(job, java.util.Set.of(trigger), true);
    } catch (SchedulerException error) {
      throw new IllegalStateException("Cannot synchronize workflow schedule", error);
    }
  }

  private static void validate(String cronExpression, String timezone) {
    if (cronExpression == null || !CronExpression.isValidExpression(cronExpression)) {
      throw new IllegalArgumentException("Invalid Quartz cron expression: " + cronExpression);
    }
    ZoneId.of(timezone == null || timezone.isBlank() ? "Asia/Shanghai" : timezone);
  }

  private static JobKey jobKey(long workflowId) {
    return JobKey.jobKey("workflow-" + workflowId, GROUP);
  }

  private static TriggerKey triggerKey(long workflowId) {
    return TriggerKey.triggerKey("workflow-" + workflowId, GROUP);
  }
}
