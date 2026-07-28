package io.yak.ops.business.workflow.service.impl;

import io.yak.ops.common.constant.workflow.WorkflowConstant;
import io.yak.ops.common.bean.dto.workflow.WorkflowScheduleDTO;
import io.yak.ops.common.bean.entity.workflow.WorkflowSchedule;
import io.yak.ops.common.enums.workflow.MisfirePolicy;
import io.yak.ops.common.enums.workflow.ScheduleConcurrencyPolicy;
import io.yak.ops.common.bean.po.workflow.WorkflowSchedulePO;
import io.yak.ops.common.bean.vo.workflow.WorkflowScheduleVO;
import io.yak.ops.business.workflow.config.ConditionalOnWorkflowEnabled;
import io.yak.ops.business.workflow.dao.WorkflowDefinitionDao;
import io.yak.ops.business.workflow.dao.WorkflowScheduleDao;
import io.yak.ops.business.workflow.schedule.WorkflowQuartzJob;
import io.yak.ops.business.workflow.service.WorkflowScheduleService;
import io.yak.ops.business.workflow.util.WorkflowConvertUtils;
import java.time.ZoneId;
import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.TimeZone;
import lombok.RequiredArgsConstructor;
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
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 工作流调度服务实现。 */
@ConditionalOnWorkflowEnabled
@Service
@RequiredArgsConstructor
public class WorkflowScheduleServiceImpl implements WorkflowScheduleService {

  private final WorkflowDefinitionDao definitionDao;
  private final WorkflowScheduleDao scheduleDao;
  private final Scheduler scheduler;

  @Override
  @Transactional(transactionManager = "workflowTransactionManager")
  public WorkflowScheduleVO saveOrUpdate(Long workflowId, WorkflowScheduleDTO scheduleDTO) {
    if (definitionDao.selectDefinitionById(workflowId) == null) {
      throw new IllegalArgumentException("工作流定义不存在：" + workflowId);
    }
    validate(scheduleDTO.getCronExpression(), scheduleDTO.getTimezone());
    WorkflowSchedulePO schedulePO = new WorkflowSchedulePO();
    schedulePO.setWorkflowId(workflowId);
    schedulePO.setCronExpression(scheduleDTO.getCronExpression());
    schedulePO.setTimezone(scheduleDTO.getTimezone());
    schedulePO.setEnabled(scheduleDTO.isEnabled());
    MisfirePolicy misfirePolicy =
        scheduleDTO.getMisfirePolicy() == null
            ? MisfirePolicy.DO_NOTHING
            : scheduleDTO.getMisfirePolicy();
    ScheduleConcurrencyPolicy concurrencyPolicy =
        scheduleDTO.getConcurrencyPolicy() == null
            ? ScheduleConcurrencyPolicy.SKIP_IF_RUNNING
            : scheduleDTO.getConcurrencyPolicy();
    schedulePO.setMisfirePolicy(misfirePolicy.name());
    schedulePO.setConcurrencyPolicy(concurrencyPolicy.name());
    schedulePO.setUpdatedAt(new Date());
    scheduleDao.saveOrUpdate(schedulePO);
    WorkflowSchedule schedule = requireSchedule(workflowId);
    synchronize(schedule);
    return WorkflowConvertUtils.toVO(schedule);
  }

  @Override
  @Transactional(transactionManager = "workflowTransactionManager")
  public void delete(Long workflowId) {
    scheduleDao.deleteByWorkflowId(workflowId);
    try {
      scheduler.deleteJob(jobKey(workflowId));
    } catch (SchedulerException error) {
      throw new IllegalStateException("删除工作流 Quartz 任务失败", error);
    }
  }

  @Override
  public WorkflowScheduleVO get(Long workflowId) {
    return WorkflowConvertUtils.toVO(requireSchedule(workflowId));
  }

  @EventListener(ApplicationReadyEvent.class)
  public void synchronizeEnabledSchedules() {
    List<WorkflowSchedule> schedules = scheduleDao.selectEnabledList();
    schedules.forEach(this::synchronize);
  }

  private WorkflowSchedule requireSchedule(Long workflowId) {
    WorkflowSchedule schedule = scheduleDao.selectByWorkflowId(workflowId);
    if (schedule == null) {
      throw new IllegalArgumentException("工作流调度不存在：" + workflowId);
    }
    return schedule;
  }

  private void synchronize(WorkflowSchedule schedule) {
    try {
      JobKey jobKey = jobKey(schedule.getWorkflowId());
      if (!schedule.isEnabled()) {
        scheduler.deleteJob(jobKey);
        return;
      }
      JobDetail job = JobBuilder.newJob(WorkflowQuartzJob.class)
          .withIdentity(jobKey)
          .usingJobData(WorkflowConstant.QUARTZ_WORKFLOW_ID_KEY, schedule.getWorkflowId())
          .build();
      CronScheduleBuilder cron = CronScheduleBuilder
          .cronSchedule(schedule.getCronExpression())
          .inTimeZone(TimeZone.getTimeZone(ZoneId.of(schedule.getTimezone())));
      cron = schedule.getMisfirePolicy()
              == MisfirePolicy.FIRE_NOW
          ? cron.withMisfireHandlingInstructionFireAndProceed()
          : cron.withMisfireHandlingInstructionDoNothing();
      CronTrigger trigger = TriggerBuilder.newTrigger()
          .withIdentity(triggerKey(schedule.getWorkflowId()))
          .forJob(job)
          .withSchedule(cron)
          .build();
      scheduler.scheduleJob(job, Set.of(trigger), true);
    } catch (SchedulerException error) {
      throw new IllegalStateException("同步工作流 Quartz 调度失败", error);
    }
  }

  private static void validate(String cronExpression, String timezone) {
    if (cronExpression == null || !CronExpression.isValidExpression(cronExpression)) {
      throw new IllegalArgumentException("Quartz Cron 表达式无效：" + cronExpression);
    }
    ZoneId.of(timezone == null || timezone.isBlank() ? "Asia/Shanghai" : timezone);
  }

  private static JobKey jobKey(Long workflowId) {
    return JobKey.jobKey("workflow-" + workflowId, WorkflowConstant.QUARTZ_GROUP);
  }

  private static TriggerKey triggerKey(Long workflowId) {
    return TriggerKey.triggerKey("workflow-" + workflowId, WorkflowConstant.QUARTZ_GROUP);
  }
}
