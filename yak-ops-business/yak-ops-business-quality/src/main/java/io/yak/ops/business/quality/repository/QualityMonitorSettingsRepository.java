package io.yak.ops.business.quality.repository;

import io.yak.ops.business.quality.api.QualityApi.AlertLevel;
import io.yak.ops.business.quality.api.QualityApi.MonitorSettingsView;
import io.yak.ops.business.quality.api.QualityApi.NotifyChannel;
import io.yak.ops.business.quality.api.QualityApi.RuleFailureAction;
import io.yak.ops.business.quality.api.QualityApi.RunMode;
import io.yak.ops.business.quality.api.QualityApi.ScheduleFrequency;
import io.yak.ops.business.quality.api.QualityApi.ScheduleWeekday;
import io.yak.ops.business.quality.config.ConditionalOnQualityEnabled;
import io.yak.ops.business.quality.repository.QualityRepository.AlertEventWrite;
import io.yak.ops.business.quality.repository.QualityRepository.MonitorSettingsWrite;
import io.yak.ops.business.quality.repository.QualityRepository.ScheduledMonitor;
import java.sql.Time;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@ConditionalOnQualityEnabled
@Repository
class QualityMonitorSettingsRepository {

  private static final DateTimeFormatter TIME_FORMATTER =
      DateTimeFormatter.ofPattern("HH:mm");

  private final NamedParameterJdbcTemplate jdbcTemplate;

  QualityMonitorSettingsRepository(
      @Qualifier("qualityJdbcTemplate") NamedParameterJdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  MonitorSettingsView find(long monitorId) {
    try {
      return jdbcTemplate.queryForObject(
          """
          SELECT run_mode, schedule_frequency, schedule_time,
                 schedule_weekday, cron_expression, next_run_time,
                 rule_failure_action, notify_enabled, notify_channel,
                 notify_target, alert_level
          FROM yak_quality_monitor_setting
          WHERE monitor_id = :monitorId
          """,
          new MapSqlParameterSource("monitorId", monitorId),
          (rs, rowNum) -> new MonitorSettingsView(
              enumValue(RunMode.class, rs.getString("run_mode"), RunMode.MANUAL),
              enumValue(ScheduleFrequency.class, rs.getString("schedule_frequency")),
              timeValue(rs.getTime("schedule_time")),
              enumValue(ScheduleWeekday.class, rs.getString("schedule_weekday")),
              rs.getString("cron_expression"),
              QualityRepositorySupport.localDateTime(rs.getTimestamp("next_run_time")),
              enumValue(
                  RuleFailureAction.class,
                  rs.getString("rule_failure_action"),
                  RuleFailureAction.CONTINUE),
              rs.getBoolean("notify_enabled"),
              enumValue(
                  NotifyChannel.class,
                  rs.getString("notify_channel"),
                  NotifyChannel.MESSAGE),
              rs.getString("notify_target"),
              enumValue(
                  AlertLevel.class,
                  rs.getString("alert_level"),
                  AlertLevel.WARNING)));
    } catch (EmptyResultDataAccessException ignored) {
      return defaults();
    }
  }

  void upsert(long monitorId, MonitorSettingsWrite write) {
    jdbcTemplate.update(
        """
        INSERT INTO yak_quality_monitor_setting (
          monitor_id, run_mode, schedule_frequency, schedule_time,
          schedule_weekday, cron_expression, next_run_time,
          rule_failure_action, notify_enabled, notify_channel,
          notify_target, alert_level
        ) VALUES (
          :monitorId, :runMode, :scheduleFrequency, :scheduleTime,
          :scheduleWeekday, :cronExpression, :nextRunTime,
          :ruleFailureAction, :notifyEnabled, :notifyChannel,
          :notifyTarget, :alertLevel
        )
        ON DUPLICATE KEY UPDATE
          run_mode = VALUES(run_mode),
          schedule_frequency = VALUES(schedule_frequency),
          schedule_time = VALUES(schedule_time),
          schedule_weekday = VALUES(schedule_weekday),
          cron_expression = VALUES(cron_expression),
          next_run_time = VALUES(next_run_time),
          rule_failure_action = VALUES(rule_failure_action),
          notify_enabled = VALUES(notify_enabled),
          notify_channel = VALUES(notify_channel),
          notify_target = VALUES(notify_target),
          alert_level = VALUES(alert_level)
        """,
        parameters(monitorId, write));
  }

  List<ScheduledMonitor> listDue(LocalDateTime now, int limit) {
    return jdbcTemplate.query(
        """
        SELECT s.monitor_id, s.run_mode, s.schedule_frequency,
               s.schedule_time, s.schedule_weekday, s.cron_expression,
               s.next_run_time
        FROM yak_quality_monitor_setting s
        JOIN yak_quality_monitor m ON m.id = s.monitor_id
        WHERE m.deleted = 0
          AND m.enabled = 1
          AND s.run_mode = 'SCHEDULE'
          AND s.next_run_time IS NOT NULL
          AND s.next_run_time <= :now
        ORDER BY s.next_run_time ASC, s.monitor_id ASC
        LIMIT :limit
        """,
        new MapSqlParameterSource()
            .addValue("now", Timestamp.valueOf(now))
            .addValue("limit", Math.max(1, limit)),
        (rs, rowNum) -> new ScheduledMonitor(
            rs.getLong("monitor_id"),
            RunMode.valueOf(rs.getString("run_mode")),
            ScheduleFrequency.valueOf(rs.getString("schedule_frequency")),
            timeValue(rs.getTime("schedule_time")),
            enumValue(ScheduleWeekday.class, rs.getString("schedule_weekday")),
            rs.getString("cron_expression"),
            QualityRepositorySupport.localDateTime(rs.getTimestamp("next_run_time"))));
  }

  boolean claim(
      long monitorId,
      LocalDateTime expectedRunTime,
      LocalDateTime nextRunTime) {
    return jdbcTemplate.update(
        """
        UPDATE yak_quality_monitor_setting s
        JOIN yak_quality_monitor m ON m.id = s.monitor_id
        SET s.next_run_time = :nextRunTime
        WHERE s.monitor_id = :monitorId
          AND s.run_mode = 'SCHEDULE'
          AND s.next_run_time = :expectedRunTime
          AND m.deleted = 0
          AND m.enabled = 1
        """,
        new MapSqlParameterSource()
            .addValue("monitorId", monitorId)
            .addValue("expectedRunTime", Timestamp.valueOf(expectedRunTime))
            .addValue("nextRunTime", Timestamp.valueOf(nextRunTime))) == 1;
  }

  void insertAlert(AlertEventWrite write) {
    jdbcTemplate.update(
        """
        INSERT INTO yak_quality_alert_event (
          monitor_id, execution_no, check_result, alert_level,
          notify_channel, notify_target, delivery_status,
          alert_message, error_message, created_at
        ) VALUES (
          :monitorId, :executionNo, :checkResult, :alertLevel,
          :notifyChannel, :notifyTarget, :deliveryStatus,
          :alertMessage, :errorMessage, :createdAt
        )
        """,
        new MapSqlParameterSource()
            .addValue("monitorId", write.monitorId())
            .addValue("executionNo", write.executionNo())
            .addValue("checkResult", write.checkResult().name())
            .addValue("alertLevel", write.alertLevel().name())
            .addValue("notifyChannel", write.notifyChannel().name())
            .addValue("notifyTarget", QualityRepositorySupport.trimToNull(write.notifyTarget()))
            .addValue("deliveryStatus", write.deliveryStatus())
            .addValue("alertMessage", write.alertMessage())
            .addValue("errorMessage", QualityRepositorySupport.trimToNull(write.errorMessage()))
            .addValue("createdAt", Timestamp.valueOf(write.createdAt())));
  }

  private MonitorSettingsView defaults() {
    return new MonitorSettingsView(
        RunMode.MANUAL,
        null,
        null,
        null,
        null,
        null,
        RuleFailureAction.CONTINUE,
        false,
        NotifyChannel.MESSAGE,
        null,
        AlertLevel.WARNING);
  }

  private MapSqlParameterSource parameters(long monitorId, MonitorSettingsWrite write) {
    return new MapSqlParameterSource()
        .addValue("monitorId", monitorId)
        .addValue("runMode", write.runMode().name())
        .addValue(
            "scheduleFrequency",
            write.scheduleFrequency() == null ? null : write.scheduleFrequency().name())
        .addValue("scheduleTime", sqlTime(write.scheduleTime()))
        .addValue(
            "scheduleWeekday",
            write.scheduleWeekday() == null ? null : write.scheduleWeekday().name())
        .addValue("cronExpression", QualityRepositorySupport.trimToNull(write.cronExpression()))
        .addValue(
            "nextRunTime",
            write.nextRunTime() == null ? null : Timestamp.valueOf(write.nextRunTime()))
        .addValue("ruleFailureAction", write.ruleFailureAction().name())
        .addValue("notifyEnabled", write.notifyEnabled())
        .addValue("notifyChannel", write.notifyChannel().name())
        .addValue("notifyTarget", QualityRepositorySupport.trimToNull(write.notifyTarget()))
        .addValue("alertLevel", write.alertLevel().name());
  }

  private Time sqlTime(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return Time.valueOf(LocalTime.parse(value.trim(), TIME_FORMATTER));
  }

  private static String timeValue(Time value) {
    return value == null ? null : value.toLocalTime().format(TIME_FORMATTER);
  }

  private static <E extends Enum<E>> E enumValue(Class<E> type, String value) {
    return enumValue(type, value, null);
  }

  private static <E extends Enum<E>> E enumValue(
      Class<E> type,
      String value,
      E defaultValue) {
    return value == null || value.isBlank() ? defaultValue : Enum.valueOf(type, value);
  }
}
