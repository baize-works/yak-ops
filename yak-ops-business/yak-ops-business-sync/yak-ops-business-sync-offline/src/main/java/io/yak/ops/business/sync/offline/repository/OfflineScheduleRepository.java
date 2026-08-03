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

/**
 * 持久化离线同步调度配置和业务重试策略。
 *
 * <p>真正的时间触发由 Yak Schedule 管理；本仓库保留业务配置和运行时间投影。</p>
 */
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
    String cronExpression = firstText(schedule, "cron", "cronExpression");
    boolean requestedEnabled = enabled(schedule, cronExpression);
    if (requestedEnabled && !StringUtils.hasText(cronExpression)) {
      throw new IllegalArgumentException("启用调度时必须填写 Cron 表达式");
    }
    if (StringUtils.hasText(cronExpression)) {
      validateCron(cronExpression);
    }

    boolean enabled = requestedEnabled && StringUtils.hasText(cronExpression);
    int maxAttempts = maxAttempts(schedule);
    int backoffSeconds = backoffSeconds(schedule);
    LocalDateTime nextFireTime = enabled ? next(cronExpression, LocalDateTime.now()) : null;
    String scheduleJson = schedule == null || schedule.isNull() ? null : write(schedule);

    LocalDateTime now = LocalDateTime.now();
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
        Timestamp.valueOf(now),
        Timestamp.valueOf(now));
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

  public List<ScheduleRecord> findAllSchedules() {
    return jdbc.query(
        selectSql() + " ORDER BY job_definition_id ASC",
        (resultSet, rowNum) -> map(resultSet));
  }

  public void updateRuntimeState(
      Long definitionId,
      LocalDateTime lastFireTime,
      LocalDateTime nextFireTime) {
    jdbc.update(
        "UPDATE yak_offline_schedule "
            + "SET last_fire_time = ?, next_fire_time = ?, update_time = ? "
            + "WHERE job_definition_id = ?",
        timestamp(lastFireTime),
        timestamp(nextFireTime),
        Timestamp.valueOf(LocalDateTime.now()),
        definitionId);
  }

  public void deleteSchedule(Long definitionId) {
    jdbc.update(
        "DELETE FROM yak_offline_schedule WHERE job_definition_id = ?",
        definitionId);
  }

  private boolean enabled(JsonNode schedule, String cronExpression) {
    if (schedule == null || schedule.isNull()) {
      return false;
    }
    JsonNode configured = schedule.get("enabled");
    if (configured != null && !configured.isNull()) {
      return configured.asBoolean(false);
    }

    String runType = text(schedule, "scheduleRunType");
    if (StringUtils.hasText(runType)) {
      return !"pause".equalsIgnoreCase(runType)
          && !"paused".equalsIgnoreCase(runType);
    }
    return StringUtils.hasText(cronExpression);
  }

  private int maxAttempts(JsonNode schedule) {
    if (schedule == null || schedule.isNull()) {
      return 1;
    }

    JsonNode retryOnFailure = schedule.get("retryOnFailure");
    if (retryOnFailure != null && !retryOnFailure.isNull()) {
      return retryOnFailure.asBoolean(false) ? 2 : 1;
    }

    if (!schedule.path("autoRetry").asBoolean(true)) {
      return 1;
    }
    JsonNode configured = schedule.path("retryPolicy").path("maxAttempts");
    if (configured.canConvertToInt() && configured.asInt() > 0) {
      return configured.asInt();
    }
    // retryTimes is the number of retries after the first attempt.
    return Math.max(1, intValue(schedule, "retryTimes", 0) + 1);
  }

  private int backoffSeconds(JsonNode schedule) {
    if (schedule == null || schedule.isNull()) {
      return 60;
    }
    JsonNode configured = schedule.path("retryPolicy").path("backoffSeconds");
    if (configured.canConvertToInt() && configured.asInt() > 0) {
      return configured.asInt();
    }
    JsonNode seconds = schedule.path("retryIntervalSeconds");
    if (seconds.canConvertToInt() && seconds.asInt() > 0) {
      return seconds.asInt();
    }
    // The historical editor exposed retryInterval in minutes.
    int minutes = intValue(schedule, "retryInterval", 1);
    return Math.max(1, minutes) * 60;
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

  private String firstText(JsonNode node, String first, String second) {
    String value = text(node, first);
    return StringUtils.hasText(value) ? value : text(node, second);
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
        ? fallback
        : node.path(field).asInt(fallback);
  }

  private void validateCron(String cron) {
    try {
      CronExpression.parse(cron);
    } catch (IllegalArgumentException exception) {
      throw new IllegalArgumentException("调度 Cron 表达式不合法：" + cron, exception);
    }
  }

  private LocalDateTime next(String cron, LocalDateTime after) {
    return CronExpression.parse(cron).next(after);
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

    public ScheduleRecord(
        Long jobDefinitionId,
        String cronExpression,
        boolean enabled,
        int retryMaxAttempts,
        int retryBackoffSeconds,
        LocalDateTime nextFireTime,
        LocalDateTime lastFireTime,
        String scheduleJson) {
      this.jobDefinitionId = jobDefinitionId;
      this.cronExpression = cronExpression;
      this.enabled = enabled;
      this.retryMaxAttempts = retryMaxAttempts;
      this.retryBackoffSeconds = retryBackoffSeconds;
      this.nextFireTime = nextFireTime;
      this.lastFireTime = lastFireTime;
      this.scheduleJson = scheduleJson;
    }

    public Long getJobDefinitionId() {
      return jobDefinitionId;
    }

    public String getCronExpression() {
      return cronExpression;
    }

    public boolean isEnabled() {
      return enabled;
    }

    public int getRetryMaxAttempts() {
      return retryMaxAttempts;
    }

    public int getRetryBackoffSeconds() {
      return retryBackoffSeconds;
    }

    public LocalDateTime getNextFireTime() {
      return nextFireTime;
    }

    public LocalDateTime getLastFireTime() {
      return lastFireTime;
    }

    public String getScheduleJson() {
      return scheduleJson;
    }
  }
}
