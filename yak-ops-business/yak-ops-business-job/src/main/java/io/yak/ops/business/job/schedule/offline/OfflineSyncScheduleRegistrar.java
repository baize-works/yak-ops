package io.yak.ops.business.job.schedule.offline;

import io.yak.framework.schedule.api.ConcurrencyPolicy;
import io.yak.framework.schedule.api.MisfirePolicy;
import io.yak.framework.schedule.api.ScheduleDefinition;
import io.yak.framework.schedule.api.ScheduleKey;
import io.yak.framework.schedule.api.ScheduleManager;
import io.yak.framework.schedule.api.SchedulePolicy;
import io.yak.framework.schedule.api.ScheduleSnapshot;
import io.yak.framework.schedule.api.ScheduleTarget;
import io.yak.framework.schedule.api.ScheduleTrigger;
import io.yak.ops.business.job.schedule.JobScheduleProperties;
import io.yak.ops.business.job.schedule.JobScheduleRegistrar;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.repository.OfflineScheduleRepository;
import io.yak.ops.business.sync.offline.repository.OfflineScheduleRepository.ScheduleRecord;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * 将离线同步调度配置注册到 Yak Schedule。
 *
 * <p>该注册器只负责时间触发。业务失败重试、Worker 选择、状态对账仍由离线同步模块负责。</p>
 */
@Component
@ConditionalOnOfflineSyncEnabled
@ConditionalOnProperty(
    prefix = "yak.job.schedule",
    name = "enabled",
    havingValue = "true",
    matchIfMissing = true)
public class OfflineSyncScheduleRegistrar implements JobScheduleRegistrar {

  private final ScheduleManager scheduleManager;
  private final OfflineScheduleRepository scheduleRepository;
  private final JobScheduleProperties properties;

  public OfflineSyncScheduleRegistrar(
      ScheduleManager scheduleManager,
      OfflineScheduleRepository scheduleRepository,
      JobScheduleProperties properties) {
    this.scheduleManager = scheduleManager;
    this.scheduleRepository = scheduleRepository;
    this.properties = properties;
  }

  @Override
  public String registrationType() {
    return OfflineSyncScheduleConstants.NAMESPACE;
  }

  @Override
  public void synchronize() {
    List<ScheduleRecord> records = scheduleRepository.findAllSchedules();
    Set<ScheduleKey> desiredKeys = new LinkedHashSet<>();

    for (ScheduleRecord record : records) {
      if (!StringUtils.hasText(record.getCronExpression())) {
        continue;
      }

      ScheduleDefinition desired = definition(record);
      desiredKeys.add(desired.key());

      Optional<ScheduleSnapshot> current = scheduleManager.get(desired.key());
      ScheduleSnapshot snapshot =
          current.isPresent() && desired.equals(current.get().definition())
              ? current.get()
              : scheduleManager.save(desired);

      scheduleRepository.updateRuntimeState(
          record.getJobDefinitionId(),
          localDateTime(snapshot.lastFireTime()),
          localDateTime(snapshot.nextFireTime()));
    }

    for (ScheduleSnapshot snapshot :
        scheduleManager.list(OfflineSyncScheduleConstants.NAMESPACE)) {
      if (!desiredKeys.contains(snapshot.definition().key())) {
        scheduleManager.delete(snapshot.definition().key());
      }
    }
  }

  ScheduleDefinition definition(ScheduleRecord record) {
    Long definitionId = record.getJobDefinitionId();
    ScheduleKey key = OfflineSyncScheduleConstants.key(definitionId);
    return new ScheduleDefinition(
        key,
        "离线同步任务定义 " + definitionId,
        ScheduleTrigger.cron(record.getCronExpression(), zoneId()),
        new ScheduleTarget(
            OfflineSyncScheduleConstants.HANDLER_NAME,
            Map.of(
                OfflineSyncScheduleConstants.PAYLOAD_DEFINITION_ID,
                definitionId.toString())),
        new SchedulePolicy(
            ConcurrencyPolicy.FORBID,
            MisfirePolicy.FIRE_ONCE_NOW,
            0),
        record.isEnabled(),
        Map.of(
            "businessType", "OFFLINE_SYNC",
            "definitionId", definitionId.toString()));
  }

  private ZoneId zoneId() {
    String configured = properties.getZoneId();
    return ZoneId.of(
        StringUtils.hasText(configured)
            ? configured.trim()
            : "Asia/Shanghai");
  }

  private LocalDateTime localDateTime(Instant instant) {
    return instant == null
        ? null
        : LocalDateTime.ofInstant(instant, zoneId());
  }
}
