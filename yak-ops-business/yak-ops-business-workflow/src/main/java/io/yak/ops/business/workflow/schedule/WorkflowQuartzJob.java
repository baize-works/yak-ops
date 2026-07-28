package io.yak.ops.business.workflow.schedule;

import io.yak.ops.business.workflow.model.WorkflowEnums.ScheduleConcurrencyPolicy;
import io.yak.ops.business.workflow.model.WorkflowEnums.TriggerType;
import io.yak.ops.business.workflow.model.WorkflowRecords.Schedule;
import io.yak.ops.business.workflow.repository.JdbcWorkflowRepository;
import io.yak.ops.business.workflow.service.WorkflowExecutionService;
import org.quartz.Job;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.springframework.context.ApplicationContext;

/** Quartz bridge that creates a durable workflow instance and immediately returns. */
public final class WorkflowQuartzJob implements Job {

  public static final String APPLICATION_CONTEXT_KEY = "yakWorkflowApplicationContext";
  public static final String WORKFLOW_ID_KEY = "workflowId";

  @Override
  public void execute(JobExecutionContext context) throws JobExecutionException {
    try {
      ApplicationContext applicationContext =
          (ApplicationContext) context.getScheduler().getContext().get(APPLICATION_CONTEXT_KEY);
      long workflowId = context.getMergedJobDataMap().getLong(WORKFLOW_ID_KEY);
      JdbcWorkflowRepository repository = applicationContext.getBean(JdbcWorkflowRepository.class);
      Schedule schedule = repository.findSchedule(workflowId).orElse(null);
      if (schedule == null || !schedule.enabled()) {
        return;
      }
      if (schedule.concurrencyPolicy() == ScheduleConcurrencyPolicy.SKIP_IF_RUNNING
          && repository.hasRunningInstance(workflowId)) {
        return;
      }
      applicationContext.getBean(WorkflowExecutionService.class)
          .trigger(workflowId, TriggerType.SCHEDULE, java.util.Map.of(), "QUARTZ");
    } catch (Exception error) {
      throw new JobExecutionException("Cannot trigger Yak Ops workflow", error, false);
    }
  }
}
