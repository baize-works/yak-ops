package io.yak.ops.business.job.schedule.quality;

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
import io.yak.ops.business.quality.api.QualityScheduleApi.ScheduleRule;
import io.yak.ops.business.quality.config.ConditionalOnQualityEnabled;
import io.yak.ops.business.quality.service.QualityScheduleService;
import java.time.ZoneId;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@ConditionalOnQualityEnabled
@ConditionalOnProperty(
    prefix = "yak.job.schedule",
    name = "enabled",
    havingValue = "true",
    matchIfMissing = true)
public class QualityRuleScheduleRegistrar implements JobScheduleRegistrar {

  private final ScheduleManager scheduleManager;
  private final QualityScheduleService scheduleService;
  private final JobScheduleProperties properties;

  public QualityRuleScheduleRegistrar(
      ScheduleManager scheduleManager,
      QualityScheduleService scheduleService,
      JobScheduleProperties properties) {
    this.scheduleManager = scheduleManager;
    this.scheduleService = scheduleService;
    this.properties = properties;
  }

  @Override
  public String registrationType() {
    return QualityScheduleConstants.NAMESPACE;
  }

  @Override
  public void synchronize() {
    List<ScheduleRule> records = scheduleService.findAllSchedules();
    Set<ScheduleKey> desiredKeys = new LinkedHashSet<>();

    for (ScheduleRule record : records) {
      if (!StringUtils.hasText(record.cronExpression())) {
        continue;
      }
      ScheduleDefinition desired = definition(record);
      desiredKeys.add(desired.key());

      Optional<ScheduleSnapshot> current = scheduleManager.get(desired.key());
      if (current.isEmpty()
          || !desired.equals(current.get().definition())) {
        scheduleManager.save(desired);
      }
    }

    for (ScheduleSnapshot snapshot :
        scheduleManager.list(QualityScheduleConstants.NAMESPACE)) {
      if (!desiredKeys.contains(snapshot.definition().key())) {
        scheduleManager.delete(snapshot.definition().key());
      }
    }
  }

  ScheduleDefinition definition(ScheduleRule record) {
    Long ruleId = record.ruleId();
    String ruleName = StringUtils.hasText(record.ruleName())
        ? record.ruleName().trim()
        : String.valueOf(ruleId);
    return new ScheduleDefinition(
        QualityScheduleConstants.key(ruleId),
        "数据质量规则 " + ruleName,
        ScheduleTrigger.cron(record.cronExpression(), zoneId()),
        new ScheduleTarget(
            QualityScheduleConstants.HANDLER_NAME,
            Map.of(
                QualityScheduleConstants.PAYLOAD_RULE_ID,
                ruleId.toString())),
        new SchedulePolicy(
            ConcurrencyPolicy.FORBID,
            MisfirePolicy.FIRE_ONCE_NOW,
            0),
        record.enabled(),
        Map.of(
            "businessType", "DATA_QUALITY",
            "ruleId", ruleId.toString()));
  }

  private ZoneId zoneId() {
    String configured = properties.getZoneId();
    return ZoneId.of(
        StringUtils.hasText(configured)
            ? configured.trim()
            : "Asia/Shanghai");
  }
}
