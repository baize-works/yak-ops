package io.yak.ops.business.quality.execution;

import io.yak.ops.business.quality.config.QualityProperties;
import io.yak.ops.business.quality.service.QualityExecutionStateService;
import java.util.List;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

public class QualityExecutionGateway {

  private final ThreadPoolTaskExecutor taskExecutor;
  private final QualityExecutionWorker worker;
  private final QualityExecutionStateService stateService;
  private final QualityProperties properties;

  public QualityExecutionGateway(
      ThreadPoolTaskExecutor taskExecutor,
      QualityExecutionWorker worker,
      QualityExecutionStateService stateService,
      QualityProperties properties) {
    this.taskExecutor = taskExecutor;
    this.worker = worker;
    this.stateService = stateService;
    this.properties = properties;
  }

  public void dispatch(long executionId) {
    try {
      taskExecutor.execute(() -> worker.execute(executionId));
    } catch (TaskRejectedException exception) {
      stateService.failQueued(executionId, "质量检查执行队列已满，请稍后重试");
    }
  }

  @EventListener(ApplicationReadyEvent.class)
  public void recover() {
    List<Long> waitingExecutions = stateService.recover(
        properties.getExecutor().getRecoveryBatchSize());
    waitingExecutions.forEach(this::dispatch);
  }
}
