package io.yak.ops.business.sync.offline.service;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.config.OfflineSyncProperties;
import io.yak.ops.business.sync.offline.repository.OfflineScheduleRepository;
import io.yak.ops.business.sync.offline.repository.OfflineScheduleRepository.ScheduleRecord;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 持久化 Cron 调度派发器；单 Yak Ops 节点通过条件更新领取到期计划。
 *
 * @author weifuwan
 */
@ConditionalOnOfflineSyncEnabled
@Component
@RequiredArgsConstructor
public class OfflineScheduleDispatcher {

  private static final Logger LOG = LoggerFactory.getLogger(OfflineScheduleDispatcher.class);

  private final OfflineScheduleRepository repository;
  private final OfflineJobExecutionService executionService;
  private final OfflineSyncProperties properties;

  @Scheduled(
      initialDelayString = "${yak.sync.offline.control.schedule-delay-millis:5000}",
      fixedDelayString = "${yak.sync.offline.control.schedule-delay-millis:5000}")
  public void dispatch() {
    LocalDateTime fireTime = LocalDateTime.now();
    int limit = Math.max(1, properties.getControl().getScanBatchSize());
    for (ScheduleRecord schedule : repository.findPendingSchedules(limit)) {
      repository.initializeNextFireTime(schedule, fireTime);
    }
    for (ScheduleRecord schedule : repository.findDueSchedules(fireTime, limit)) {
      if (!repository.claimSchedule(schedule, fireTime)) {
        continue;
      }
      try {
        executionService.executeScheduled(schedule.getJobDefinitionId());
      } catch (RuntimeException exception) {
        LOG.warn(
            "Offline schedule dispatch failed, definitionId={}",
            schedule.getJobDefinitionId(),
            exception);
      }
    }
  }
}
