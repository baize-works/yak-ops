package io.yak.ops.business.workflow.schedule;

import io.yak.ops.business.workflow.common.constant.WorkflowConstant;
import io.yak.ops.business.workflow.common.entity.workflow.WorkflowSchedule;
import io.yak.ops.business.workflow.common.enums.ScheduleConcurrencyPolicy;
import io.yak.ops.business.workflow.common.enums.TriggerType;
import io.yak.ops.business.workflow.dao.WorkflowExecutionDao;
import io.yak.ops.business.workflow.dao.WorkflowScheduleDao;
import io.yak.ops.business.workflow.service.WorkflowExecutionService;
import java.util.LinkedHashMap;
import org.quartz.Job;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.springframework.context.ApplicationContext;

/** Quartz 只负责触发持久化工作流实例，不在 Quartz 线程中执行 DAG。 */
public class WorkflowQuartzJob implements Job {

  @Override
  public void execute(JobExecutionContext context) throws JobExecutionException {
    try {
      ApplicationContext applicationContext = (ApplicationContext) context
          .getScheduler()
          .getContext()
          .get(WorkflowConstant.QUARTZ_APPLICATION_CONTEXT_KEY);
      long workflowId = context.getMergedJobDataMap()
          .getLong(WorkflowConstant.QUARTZ_WORKFLOW_ID_KEY);
      WorkflowScheduleDao scheduleDao = applicationContext.getBean(WorkflowScheduleDao.class);
      WorkflowExecutionDao executionDao = applicationContext.getBean(WorkflowExecutionDao.class);
      WorkflowSchedule schedule = scheduleDao.selectByWorkflowId(workflowId);
      if (schedule == null || !schedule.isEnabled()) {
        return;
      }
      if (schedule.getConcurrencyPolicy() == ScheduleConcurrencyPolicy.SKIP_IF_RUNNING
          && executionDao.existsRunningInstance(workflowId)) {
        return;
      }
      applicationContext.getBean(WorkflowExecutionService.class)
          .triggerWorkflow(
              workflowId,
              TriggerType.SCHEDULE,
              new LinkedHashMap<>(),
              WorkflowConstant.QUARTZ_OPERATOR);
    } catch (Exception error) {
      throw new JobExecutionException("触发 Yak Ops 工作流失败", error, false);
    }
  }
}
