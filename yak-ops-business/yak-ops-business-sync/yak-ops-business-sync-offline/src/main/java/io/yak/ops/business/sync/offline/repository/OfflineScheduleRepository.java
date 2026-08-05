package io.yak.ops.business.sync.offline.repository;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;

/** 调度配置直接存放在任务定义表中。 */
@ConditionalOnOfflineSyncEnabled
@Repository
public class OfflineScheduleRepository {
  private final JdbcTemplate jdbc;
  private final ObjectMapper objectMapper;

  public OfflineScheduleRepository(@Qualifier("offlineSyncDataSource") DataSource dataSource,
      @Qualifier("offlineSyncJsonMapper") ObjectMapper objectMapper) {
    this.jdbc = new JdbcTemplate(dataSource);
    this.objectMapper = objectMapper;
  }

  public ScheduleRecord saveSchedule(Long definitionId, JsonNode schedule) {
    String cron = firstText(schedule, "cron", "cronExpression");
    boolean enabled = enabled(schedule, cron);
    if (enabled && !StringUtils.hasText(cron)) {
      throw new IllegalArgumentException("启用调度时必须填写 Cron 表达式");
    }
    if (StringUtils.hasText(cron)) CronExpression.parse(cron);
    int attempts = maxAttempts(schedule);
    int backoff = backoffSeconds(schedule);
    LocalDateTime next = enabled ? CronExpression.parse(cron).next(LocalDateTime.now()) : null;
    jdbc.update("UPDATE yak_offline_job_definition SET schedule_json=?, schedule_enabled=?, "
            + "cron_expression=?, retry_max_attempts=?, retry_backoff_seconds=?, "
            + "schedule_next_fire_time=?, update_time=? WHERE id=?",
        writeNullable(schedule), enabled, cron, Math.max(1, attempts), Math.max(1, backoff),
        timestamp(next), Timestamp.valueOf(LocalDateTime.now()), definitionId);
    return findSchedule(definitionId);
  }

  public ScheduleRecord findSchedule(Long definitionId) {
    List<ScheduleRecord> values = jdbc.query(selectSql() + " WHERE id=?",
        (rs, row) -> map(rs), definitionId);
    return values.isEmpty() ? null : values.get(0);
  }

  public List<ScheduleRecord> findAllSchedules() {
    return jdbc.query(selectSql() + " WHERE cron_expression IS NOT NULL ORDER BY id",
        (rs, row) -> map(rs));
  }

  public void updateRuntimeState(Long definitionId, LocalDateTime last, LocalDateTime next) {
    jdbc.update("UPDATE yak_offline_job_definition SET schedule_last_fire_time=?, "
            + "schedule_next_fire_time=?, update_time=? WHERE id=?",
        timestamp(last), timestamp(next), Timestamp.valueOf(LocalDateTime.now()), definitionId);
  }

  public void deleteSchedule(Long definitionId) {
    jdbc.update("UPDATE yak_offline_job_definition SET schedule_json=NULL, schedule_enabled=0, "
            + "cron_expression=NULL, retry_max_attempts=1, retry_backoff_seconds=60, "
            + "schedule_last_fire_time=NULL, schedule_next_fire_time=NULL WHERE id=?", definitionId);
  }

  private String selectSql() {
    return "SELECT id, cron_expression, schedule_enabled, retry_max_attempts, "
        + "retry_backoff_seconds, schedule_next_fire_time, schedule_last_fire_time, schedule_json "
        + "FROM yak_offline_job_definition";
  }

  private ScheduleRecord map(java.sql.ResultSet rs) throws java.sql.SQLException {
    return new ScheduleRecord(rs.getLong("id"), rs.getString("cron_expression"),
        rs.getBoolean("schedule_enabled"), rs.getInt("retry_max_attempts"),
        rs.getInt("retry_backoff_seconds"), local(rs.getTimestamp("schedule_next_fire_time")),
        local(rs.getTimestamp("schedule_last_fire_time")), rs.getString("schedule_json"));
  }

  private boolean enabled(JsonNode node, String cron) {
    if (node == null || node.isNull()) return false;
    if (node.hasNonNull("enabled")) return node.path("enabled").asBoolean(false);
    String type = text(node, "scheduleRunType");
    return StringUtils.hasText(type)
        ? !"pause".equalsIgnoreCase(type) && !"paused".equalsIgnoreCase(type)
        : StringUtils.hasText(cron);
  }

  private int maxAttempts(JsonNode node) {
    if (node == null || node.isNull()) return 1;
    if (node.hasNonNull("retryOnFailure")) return node.path("retryOnFailure").asBoolean() ? 2 : 1;
    if (!node.path("autoRetry").asBoolean(true)) return 1;
    int configured = node.path("retryPolicy").path("maxAttempts").asInt(0);
    return configured > 0 ? configured : Math.max(1, node.path("retryTimes").asInt(0) + 1);
  }

  private int backoffSeconds(JsonNode node) {
    if (node == null || node.isNull()) return 60;
    int value = node.path("retryPolicy").path("backoffSeconds").asInt(0);
    if (value > 0) return value;
    value = node.path("retryIntervalSeconds").asInt(0);
    if (value > 0) return value;
    return Math.max(1, node.path("retryInterval").asInt(1)) * 60;
  }

  private String firstText(JsonNode node, String first, String second) {
    String value = text(node, first);
    return StringUtils.hasText(value) ? value : text(node, second);
  }
  private String text(JsonNode node, String field) {
    if (node == null || !node.hasNonNull(field)) return null;
    String value = node.path(field).asText(null);
    return StringUtils.hasText(value) ? value.trim() : null;
  }
  private String writeNullable(JsonNode node) {
    if (node == null || node.isNull()) return null;
    try { return objectMapper.writeValueAsString(node); }
    catch (Exception e) { throw new IllegalStateException("序列化调度配置失败", e); }
  }
  private Timestamp timestamp(LocalDateTime value) { return value == null ? null : Timestamp.valueOf(value); }
  private LocalDateTime local(Timestamp value) { return value == null ? null : value.toLocalDateTime(); }

  public static final class ScheduleRecord {
    private final Long jobDefinitionId; private final String cronExpression; private final boolean enabled;
    private final int retryMaxAttempts; private final int retryBackoffSeconds;
    private final LocalDateTime nextFireTime; private final LocalDateTime lastFireTime; private final String scheduleJson;
    public ScheduleRecord(Long id, String cron, boolean enabled, int attempts, int backoff,
        LocalDateTime next, LocalDateTime last, String json) {
      this.jobDefinitionId=id; this.cronExpression=cron; this.enabled=enabled;
      this.retryMaxAttempts=attempts; this.retryBackoffSeconds=backoff;
      this.nextFireTime=next; this.lastFireTime=last; this.scheduleJson=json;
    }
    public Long getJobDefinitionId(){return jobDefinitionId;} public String getCronExpression(){return cronExpression;}
    public boolean isEnabled(){return enabled;} public int getRetryMaxAttempts(){return retryMaxAttempts;}
    public int getRetryBackoffSeconds(){return retryBackoffSeconds;} public LocalDateTime getNextFireTime(){return nextFireTime;}
    public LocalDateTime getLastFireTime(){return lastFireTime;} public String getScheduleJson(){return scheduleJson;}
  }
}
