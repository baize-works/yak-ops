package io.yak.ops.business.sync.offline.repository;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;

/** 持久化 Cron 计划和重试策略。 */
@ConditionalOnOfflineSyncEnabled
@Repository
public class OfflineScheduleRepository {

  private final JdbcTemplate jdbc;
  private final ObjectMapper objectMapper;

  public OfflineScheduleRepository(
      @Qualifier("offlineSyncDataSource") DataSource dataSource,
      @Qualifier("offlineSyncJsonMapper") ObjectMapper objectMapper) {
    this.jdbc = new JdbcTemplate(dataSource);
    this.objectMapper = objectMapper;
  }

  public ScheduleRecord saveSchedule(Long definitionId, JsonNode schedule) {
    String cronExpression = text(schedule, "cronExpression");
    String runType = text(schedule, "scheduleRunType");
    boolean enabled = StringUtils.hasText(cronExpression)
        && !"pause".equalsIgnoreCase(runType)
        && !"paused".equalsIgnoreCase(runType);
    int maxAttempts = nestedInt(schedule, "retryPolicy", "maxAttempts",
        intValue(schedule, "retryTimes", 1));
    int backoffSeconds = nestedInt(schedule, "retryPolicy", "backoffSeconds",
        intValue(schedule, "retryIntervalSeconds", 30));
    LocalDateTime nextFireTime = enabled ? next(cronExpression, LocalDateTime.now()) : null;
    String scheduleJson = schedule == null || schedule.isNull() ? null : write(schedule);

    jdbc.update(
        "INSERT INTO yak_offline_schedule "
            + "(job_definition_id, cron_expression, enabled, retry_max_attempts, retry_backoff_seconds, "
            + "next_fire_time, schedule_json, create_time, update_time) "
            + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) "
            + "ON DUPLICATE KEY UPDATE cron_expression = VALUES(cron_expression), enabled = VALUES(enabled), "
            + "retry_max_attempts = VALUES(retry_max_attempts), "
            + "retry_backoff_seconds = VALUES(retry_backoff_seconds), "
            + "next_fire_time = VALUES(next_fire_time), schedule_json = VALUES(schedule_json), "
            + "update_time = VALUES(update_time)",
        definitionId,
        cronExpression,
        enabled,
        Math.max(1, maxAttempts),
        Math.max(1, backoffSeconds),
        timestamp(nextFireTime),
        scheduleJson,
        Timestamp.valueOf(LocalDateTime.now()),
        Timestamp.valueOf(LocalDateTime.now()));
    return findSchedule(definitionId);
  }

  public ScheduleRecord findSchedule(Long definitionId) {
    try {
      return jdbc.queryForObject(
          selectSql() + " WHERE job_definition_id = ?",
          (resultSet, rowNum) -> map(resultSet),
          definitionId);
    } catch (EmptyResultDataAccessException exception) {
      return null;
    }
  }

  public List<ScheduleRecord> findDueSchedules(LocalDateTime now, int limit) {
    return jdbc.query(
        selectSql() + " WHERE enabled = 1 AND next_fire_time IS NOT NULL "
            + "AND next_fire_time <= ? ORDER BY next_fire_time ASC LIMIT ?",
        (resultSet, rowNum) -> map(resultSet),
        Timestamp.valueOf(now),
        Math.max(1, limit));
  }

  public boolean claimSchedule(ScheduleRecord schedule, LocalDateTime fireTime) {
    LocalDateTime nextFireTime = next(schedule.getCronExpression(), fireTime.plusSeconds(1));
    return jdbc.update(
        "UPDATE yak_offline_schedule SET last_fire_time = ?, next_fire_time = ?, update_time = ? "
            + "WHERE job_definition_id = ? AND enabled = 1 AND next_fire_time = ?",
        Timestamp.valueOf(fireTime),
        timestamp(nextFireTime),
        Timestamp.valueOf(LocalDateTime.now()),
        schedule.getJobDefinitionId(),
        timestamp(schedule.getNextFireTime())) > 0;
  }

  private String selectSql() {
    return "SELECT job_definition_id, cron_expression, enabled, retry_max_attempts, "
        + "retry_backoff_seconds, next_fire_time, last_fire_time, schedule_json "
        + "FROM yak_offline_schedule";
  }

  private ScheduleRecord map(java.sql.ResultSet resultSet) throws java.sql.SQLException {
    return new ScheduleRecord(
        resultSet.getLong("job_definition_id"),
        resultSet.getString("cron_expression"),
        resultSet.getBoolean("enabled"),
        resultSet.getInt("retry_max_attempts"),
        resultSet.getInt("retry_backoff_seconds"),
        localDateTime(resultSet.getTimestamp("next_fire_time")),
        localDateTime(resultSet.getTimestamp("last_fire_time")),
        resultSet.getString("schedule_json"));
  }

  private String write(JsonNode value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (Exception exception) {
      throw new IllegalStateException("序列化离线同步调度配置失败", exception);
    }
  }

  private String text(JsonNode node, String field) {
    if (node == null || node.isNull() || !node.hasNonNull(field)) {
      return null;
    }
    String value = node.path(field).asText(null);
    return StringUtils.hasText(value) ? value.trim() : null;
  }

  private int intValue(JsonNode node, String field, int fallback) {
    return node == null || !node.path(field).canConvertToInt()
        ? fallback : node.path(field).asInt(fallback);
  }

  private int nestedInt(JsonNode node, String objectField, String field, int fallback) {
    return node == null ? fallback : intValue(node.path(objectField), field, fallback);
  }

  private LocalDateTime next(String cron, LocalDateTime after) {
    if (!StringUtils.hasText(cron)) {
      return null;
    }
    try {
      return CronExpression.parse(cron).next(after);
    } catch (IllegalArgumentException exception) {
      throw new IllegalArgumentException("调度 Cron 表达式不合法：" + cron, exception);
    }
  }

  private Timestamp timestamp(LocalDateTime value) {
    return value == null ? null : Timestamp.valueOf(value);
  }

  private LocalDateTime localDateTime(Timestamp value) {
    return value == null ? null : value.toLocalDateTime();
  }

  public static final class ScheduleRecord {
    private final Long jobDefinitionId;
    private final String cronExpression;
    private final boolean enabled;
    private final int retryMaxAttempts;
    private final int retryBackoffSeconds;
    private final LocalDateTime nextFireTime;
    private final LocalDateTime lastFireTime;
    private final String scheduleJson;

    public ScheduleRecord(Long jobDefinitionId, String cronExpression, boolean enabled,
        int retryMaxAttempts, int retryBackoffSeconds, LocalDateTime nextFireTime,
        LocalDateTime lastFireTime, String scheduleJson) {
      this.jobDefinitionId = jobDefinitionId;
      this.cronExpression = cronExpression;
      this.enabled = enabled;
      this.retryMaxAttempts = retryMaxAttempts;
      this.retryBackoffSeconds = retryBackoffSeconds;
      this.nextFireTime = nextFireTime;
      this.lastFireTime = lastFireTime;
      this.scheduleJson = scheduleJson;
    }

    public Long getJobDefinitionId() { return jobDefinitionId; }
    public String getCronExpression() { return cronExpression; }
    public boolean isEnabled() { return enabled; }
    public int getRetryMaxAttempts() { return retryMaxAttempts; }
    public int getRetryBackoffSeconds() { return retryBackoffSeconds; }
    public LocalDateTime getNextFireTime() { return nextFireTime; }
    public LocalDateTime getLastFireTime() { return lastFireTime; }
    public String getScheduleJson() { return scheduleJson; }
  }
}
