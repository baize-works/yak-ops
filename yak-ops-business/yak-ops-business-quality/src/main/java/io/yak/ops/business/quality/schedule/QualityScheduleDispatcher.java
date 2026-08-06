package io.yak.ops.business.quality.schedule;

import io.yak.ops.business.quality.config.ConditionalOnQualityEnabled;
import io.yak.ops.business.quality.config.QualityProperties;
import io.yak.ops.business.quality.repository.QualityRepository;
import io.yak.ops.business.quality.repository.QualityRepository.ScheduledMonitor;
import io.yak.ops.business.quality.service.QualityExecutionService;
import java.time.LocalDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@ConditionalOnQualityEnabled
@Component
public class QualityScheduleDispatcher {

  private static final Logger LOGGER =
      LoggerFactory.getLogger(QualityScheduleDispatcher.class);

  private final QualityRepository repository;
  private final QualityExecutionService executionService;
  private final QualityScheduleCalculator calculator;
  private final QualityProperties properties;

  public QualityScheduleDispatcher(
      QualityRepository repository,
      QualityExecutionService executionService,
      QualityScheduleCalculator calculator,
      QualityProperties properties) {
    this.repository = repository;
    this.executionService = executionService;
    this.calculator = calculator;
    this.properties = properties;
  }

  @Scheduled(fixedDelayString = "${yak.quality.scheduler.poll-interval-ms:30000}")
  public void dispatchDueMonitors() {
    LocalDateTime now = LocalDateTime.now();
    int batchSize = Math.max(1, properties.getScheduler().getBatchSize());
    List<ScheduledMonitor> dueMonitors = repository.listDueMonitors(now, batchSize);
    for (ScheduledMonitor monitor : dueMonitors) {
      dispatchOne(monitor, now);
    }
  }

  private void dispatchOne(ScheduledMonitor monitor, LocalDateTime now) {
    try {
      LocalDateTime nextRunTime = calculator.nextRun(
          monitor.runMode(),
          monitor.scheduleFrequency(),
          monitor.scheduleTime(),
          monitor.scheduleWeekday(),
          monitor.cronExpression(),
          now.plusNanos(1));
      if (!repository.claimMonitorSchedule(
          monitor.monitorId(), monitor.expectedRunTime(), nextRunTime)) {
        return;
      }
      executionService.runScheduled(monitor.monitorId());
    } catch (RuntimeException exception) {
      LOGGER.warn(
          "Failed to dispatch scheduled quality monitor {}: {}",
          monitor.monitorId(),
          exception.getMessage(),
          exception);
    }
  }
}
