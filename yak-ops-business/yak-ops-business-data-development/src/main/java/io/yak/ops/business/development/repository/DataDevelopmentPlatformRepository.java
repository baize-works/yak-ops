package io.yak.ops.business.development.repository;

import io.yak.ops.business.development.config.ConditionalOnDataDevelopmentEnabled;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.AuditEntry;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.EngineEndpoint;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.Environment;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.EnvironmentType;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.HealthStatus;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.ParameterTemplate;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.PlatformOverview;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.ProbeType;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.SecretMetadata;
import io.yak.ops.business.development.service.DataDevelopmentJsonCodec;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Repository;

/** JDBC persistence for platform environments, secrets, templates, engines and audit. */
@ConditionalOnDataDevelopmentEnabled
@Repository
public final class DataDevelopmentPlatformRepository {

  private final NamedParameterJdbcTemplate jdbc;
  private final DataDevelopmentJsonCodec json;

  public DataDevelopmentPlatformRepository(
      @Qualifier("dataDevelopmentJdbcTemplate") NamedParameterJdbcTemplate jdbc,
      DataDevelopmentJsonCodec json) {
    this.jdbc = jdbc;
    this.json = json;
  }

  public List<Environment> listEnvironments() {
    return jdbc.query("""
        SELECT * FROM yak_dev_environment ORDER BY environment_type, code
        """, Map.of(), environmentMapper());
  }

  public Optional<Environment> findEnvironment(long id) {
    return first(jdbc.query("SELECT * FROM yak_dev_environment WHERE id=:id",
        Map.of("id", id), environmentMapper()));
  }

  public long insertEnvironment(
      String code, String name, String type, String description, boolean enabled,
      String variablesJson, String operator, LocalDateTime now) {
    KeyHolder key = new GeneratedKeyHolder();
    jdbc.update("""
        INSERT INTO yak_dev_environment
          (code,name,environment_type,description,enabled,variables_json,lock_version,
           created_by,updated_by,created_at,updated_at)
        VALUES (:code,:name,:type,:description,:enabled,:variables,0,:operator,:operator,:now,:now)
        """, new MapSqlParameterSource()
        .addValue("code", code).addValue("name", name).addValue("type", type)
        .addValue("description", description).addValue("enabled", enabled)
        .addValue("variables", variablesJson).addValue("operator", operator)
        .addValue("now", now), key, new String[]{"id"});
    return requiredKey(key);
  }

  public int updateEnvironment(
      long id, String code, String name, String type, String description, boolean enabled,
      String variablesJson, int lockVersion, String operator, LocalDateTime now) {
    return jdbc.update("""
        UPDATE yak_dev_environment
        SET code=:code,name=:name,environment_type=:type,description=:description,
            enabled=:enabled,variables_json=:variables,updated_by=:operator,
            updated_at=:now,lock_version=lock_version+1
        WHERE id=:id AND lock_version=:lockVersion
        """, Map.ofEntries(
        Map.entry("id", id), Map.entry("code", code), Map.entry("name", name),
        Map.entry("type", type), Map.entry("description", nullable(description)),
        Map.entry("enabled", enabled), Map.entry("variables", variablesJson),
        Map.entry("operator", operator), Map.entry("now", now),
        Map.entry("lockVersion", lockVersion)));
  }

  public int deleteEnvironment(long id) {
    return jdbc.update("DELETE FROM yak_dev_environment WHERE id=:id", Map.of("id", id));
  }

  public List<SecretMetadata> listSecrets() {
    return jdbc.query("""
        SELECT id,environment_id,secret_key,description,updated_by,updated_at
        FROM yak_dev_secret ORDER BY environment_id, secret_key
        """, Map.of(), (rs, row) -> new SecretMetadata(
        rs.getLong("id"), rs.getLong("environment_id"), rs.getString("secret_key"),
        rs.getString("description"), "••••••••", rs.getString("updated_by"),
        rs.getTimestamp("updated_at").toLocalDateTime()));
  }

  public Optional<String> findEncryptedSecret(long environmentId, String secretKey) {
    List<String> values = jdbc.query("""
        SELECT encrypted_value FROM yak_dev_secret
        WHERE environment_id=:environmentId AND secret_key=:secretKey
        """, Map.of("environmentId", environmentId, "secretKey", secretKey),
        (rs, row) -> rs.getString(1));
    return first(values);
  }

  public long upsertSecret(
      Long id, long environmentId, String secretKey, String description,
      String encryptedValue, String digest, String operator, LocalDateTime now) {
    if (id == null) {
      KeyHolder key = new GeneratedKeyHolder();
      jdbc.update("""
          INSERT INTO yak_dev_secret
            (environment_id,secret_key,description,encrypted_value,value_digest,
             created_by,updated_by,created_at,updated_at)
          VALUES (:environmentId,:secretKey,:description,:encryptedValue,:digest,
                  :operator,:operator,:now,:now)
          """, new MapSqlParameterSource()
          .addValue("environmentId", environmentId).addValue("secretKey", secretKey)
          .addValue("description", description).addValue("encryptedValue", encryptedValue)
          .addValue("digest", digest).addValue("operator", operator).addValue("now", now),
          key, new String[]{"id"});
      return requiredKey(key);
    }
    jdbc.update("""
        UPDATE yak_dev_secret
        SET environment_id=:environmentId,secret_key=:secretKey,description=:description,
            encrypted_value=:encryptedValue,value_digest=:digest,updated_by=:operator,updated_at=:now
        WHERE id=:id
        """, Map.ofEntries(Map.entry("id", id), Map.entry("environmentId", environmentId),
        Map.entry("secretKey", secretKey), Map.entry("description", nullable(description)),
        Map.entry("encryptedValue", encryptedValue), Map.entry("digest", digest),
        Map.entry("operator", operator), Map.entry("now", now)));
    return id;
  }

  public int deleteSecret(long id) {
    return jdbc.update("DELETE FROM yak_dev_secret WHERE id=:id", Map.of("id", id));
  }

  public int deleteSecretsByEnvironment(long environmentId) {
    return jdbc.update("DELETE FROM yak_dev_secret WHERE environment_id=:environmentId",
        Map.of("environmentId", environmentId));
  }

  public List<ParameterTemplate> listParameterTemplates() {
    return jdbc.query("SELECT * FROM yak_dev_parameter_template ORDER BY code",
        Map.of(), templateMapper());
  }

  public Optional<ParameterTemplate> findParameterTemplate(long id) {
    return first(jdbc.query("SELECT * FROM yak_dev_parameter_template WHERE id=:id",
        Map.of("id", id), templateMapper()));
  }

  public long insertParameterTemplate(
      String code, String name, String description, boolean enabled, String parametersJson,
      String operator, LocalDateTime now) {
    KeyHolder key = new GeneratedKeyHolder();
    jdbc.update("""
        INSERT INTO yak_dev_parameter_template
          (code,name,description,enabled,parameters_json,lock_version,
           created_by,updated_by,created_at,updated_at)
        VALUES (:code,:name,:description,:enabled,:parameters,0,:operator,:operator,:now,:now)
        """, new MapSqlParameterSource().addValue("code", code).addValue("name", name)
        .addValue("description", description).addValue("enabled", enabled)
        .addValue("parameters", parametersJson).addValue("operator", operator)
        .addValue("now", now), key, new String[]{"id"});
    return requiredKey(key);
  }

  public int updateParameterTemplate(
      long id, String code, String name, String description, boolean enabled,
      String parametersJson, int lockVersion, String operator, LocalDateTime now) {
    return jdbc.update("""
        UPDATE yak_dev_parameter_template
        SET code=:code,name=:name,description=:description,enabled=:enabled,
            parameters_json=:parameters,updated_by=:operator,updated_at=:now,
            lock_version=lock_version+1
        WHERE id=:id AND lock_version=:lockVersion
        """, Map.ofEntries(Map.entry("id", id), Map.entry("code", code),
        Map.entry("name", name), Map.entry("description", nullable(description)),
        Map.entry("enabled", enabled), Map.entry("parameters", parametersJson),
        Map.entry("operator", operator), Map.entry("now", now),
        Map.entry("lockVersion", lockVersion)));
  }

  public int deleteParameterTemplate(long id) {
    return jdbc.update("DELETE FROM yak_dev_parameter_template WHERE id=:id", Map.of("id", id));
  }

  public List<EngineEndpoint> listEngineEndpoints() {
    return jdbc.query("SELECT * FROM yak_dev_engine_endpoint ORDER BY task_type, code",
        Map.of(), engineMapper());
  }

  public Optional<EngineEndpoint> findEngineEndpoint(long id) {
    return first(jdbc.query("SELECT * FROM yak_dev_engine_endpoint WHERE id=:id",
        Map.of("id", id), engineMapper()));
  }

  public long insertEngineEndpoint(
      String taskType, String code, String name, String probeType, String endpoint,
      boolean enabled, String configJson, String operator, LocalDateTime now) {
    KeyHolder key = new GeneratedKeyHolder();
    jdbc.update("""
        INSERT INTO yak_dev_engine_endpoint
          (task_type,code,name,probe_type,endpoint,enabled,config_json,health_status,
           lock_version,created_by,updated_by,created_at,updated_at)
        VALUES (:taskType,:code,:name,:probeType,:endpoint,:enabled,:config,'UNKNOWN',0,
                :operator,:operator,:now,:now)
        """, new MapSqlParameterSource().addValue("taskType", taskType)
        .addValue("code", code).addValue("name", name).addValue("probeType", probeType)
        .addValue("endpoint", endpoint).addValue("enabled", enabled)
        .addValue("config", configJson).addValue("operator", operator).addValue("now", now),
        key, new String[]{"id"});
    return requiredKey(key);
  }

  public int updateEngineEndpoint(
      long id, String taskType, String code, String name, String probeType, String endpoint,
      boolean enabled, String configJson, int lockVersion, String operator, LocalDateTime now) {
    return jdbc.update("""
        UPDATE yak_dev_engine_endpoint
        SET task_type=:taskType,code=:code,name=:name,probe_type=:probeType,
            endpoint=:endpoint,enabled=:enabled,config_json=:config,
            updated_by=:operator,updated_at=:now,lock_version=lock_version+1
        WHERE id=:id AND lock_version=:lockVersion
        """, Map.ofEntries(Map.entry("id", id), Map.entry("taskType", taskType),
        Map.entry("code", code), Map.entry("name", name), Map.entry("probeType", probeType),
        Map.entry("endpoint", nullable(endpoint)), Map.entry("enabled", enabled),
        Map.entry("config", configJson), Map.entry("operator", operator),
        Map.entry("now", now), Map.entry("lockVersion", lockVersion)));
  }

  public int updateEngineHealth(
      long id, HealthStatus status, String message, LocalDateTime checkedAt) {
    return jdbc.update("""
        UPDATE yak_dev_engine_endpoint
        SET health_status=:status,health_message=:message,last_checked_at=:checkedAt
        WHERE id=:id
        """, Map.of("id", id, "status", status.name(),
        "message", nullable(message), "checkedAt", checkedAt));
  }

  public int deleteEngineEndpoint(long id) {
    return jdbc.update("DELETE FROM yak_dev_engine_endpoint WHERE id=:id", Map.of("id", id));
  }

  public void insertAudit(
      String action, String resourceType, String resourceId,
      String summaryJson, String operator, LocalDateTime now) {
    jdbc.update("""
        INSERT INTO yak_dev_audit_log
          (action,resource_type,resource_id,summary_json,operator,occurred_at)
        VALUES (:action,:resourceType,:resourceId,:summary,:operator,:now)
        """, Map.of("action", action, "resourceType", resourceType,
        "resourceId", nullable(resourceId), "summary", summaryJson,
        "operator", operator, "now", now));
  }

  public List<AuditEntry> listAudit(int limit) {
    int safeLimit = Math.min(500, Math.max(1, limit));
    return jdbc.query("""
        SELECT * FROM yak_dev_audit_log ORDER BY occurred_at DESC, id DESC LIMIT :limit
        """, Map.of("limit", safeLimit), (rs, row) -> new AuditEntry(
        rs.getLong("id"), rs.getString("action"), rs.getString("resource_type"),
        rs.getString("resource_id"), json.readTree(rs.getString("summary_json")),
        rs.getString("operator"), rs.getTimestamp("occurred_at").toLocalDateTime()));
  }

  public PlatformOverview overview(LocalDateTime since) {
    long projects = scalar("SELECT COUNT(*) FROM yak_dev_project", Map.of());
    long tasks = scalar("SELECT COUNT(*) FROM yak_dev_task", Map.of());
    long executions = scalar("SELECT COUNT(*) FROM yak_dev_execution WHERE created_at>=:since",
        Map.of("since", since));
    long failed = scalar("""
        SELECT COUNT(*) FROM yak_dev_execution
        WHERE created_at>=:since AND status IN ('FAILED','TIMED_OUT','LOST')
        """, Map.of("since", since));
    long succeeded = scalar("""
        SELECT COUNT(*) FROM yak_dev_execution
        WHERE created_at>=:since AND status='SUCCEEDED'
        """, Map.of("since", since));
    long environments = scalar("SELECT COUNT(*) FROM yak_dev_environment", Map.of());
    long secrets = scalar("SELECT COUNT(*) FROM yak_dev_secret", Map.of());
    long templates = scalar("SELECT COUNT(*) FROM yak_dev_parameter_template", Map.of());
    long healthy = scalar("SELECT COUNT(*) FROM yak_dev_engine_endpoint WHERE health_status='HEALTHY'",
        Map.of());
    long unhealthy = scalar("""
        SELECT COUNT(*) FROM yak_dev_engine_endpoint
        WHERE enabled=1 AND health_status IN ('DEGRADED','UNHEALTHY')
        """, Map.of());
    long terminal = succeeded + failed;
    double successRate = terminal == 0 ? 0D : Math.round((succeeded * 10000D) / terminal) / 100D;
    return new PlatformOverview(projects, tasks, executions, failed, environments,
        secrets, templates, healthy, unhealthy, successRate);
  }

  private long scalar(String sql, Map<String, ?> params) {
    Long value = jdbc.queryForObject(sql, params, Long.class);
    return value == null ? 0L : value;
  }

  private RowMapper<Environment> environmentMapper() {
    return (rs, row) -> new Environment(rs.getLong("id"), rs.getString("code"),
        rs.getString("name"), EnvironmentType.valueOf(rs.getString("environment_type")),
        rs.getString("description"), rs.getBoolean("enabled"),
        json.readTree(rs.getString("variables_json")), rs.getInt("lock_version"),
        rs.getString("created_by"), rs.getString("updated_by"),
        time(rs, "created_at"), time(rs, "updated_at"));
  }

  private RowMapper<ParameterTemplate> templateMapper() {
    return (rs, row) -> new ParameterTemplate(rs.getLong("id"), rs.getString("code"),
        rs.getString("name"), rs.getString("description"), rs.getBoolean("enabled"),
        json.readTree(rs.getString("parameters_json")), rs.getInt("lock_version"),
        rs.getString("created_by"), rs.getString("updated_by"),
        time(rs, "created_at"), time(rs, "updated_at"));
  }

  private RowMapper<EngineEndpoint> engineMapper() {
    return (rs, row) -> new EngineEndpoint(rs.getLong("id"), rs.getString("task_type"),
        rs.getString("code"), rs.getString("name"),
        ProbeType.valueOf(rs.getString("probe_type")), rs.getString("endpoint"),
        rs.getBoolean("enabled"), json.readTree(rs.getString("config_json")),
        HealthStatus.valueOf(rs.getString("health_status")), rs.getString("health_message"),
        nullableTime(rs, "last_checked_at"), rs.getInt("lock_version"),
        rs.getString("created_by"), rs.getString("updated_by"),
        time(rs, "created_at"), time(rs, "updated_at"));
  }

  private static LocalDateTime time(ResultSet rs, String column) throws SQLException {
    return rs.getTimestamp(column).toLocalDateTime();
  }

  private static LocalDateTime nullableTime(ResultSet rs, String column) throws SQLException {
    var value = rs.getTimestamp(column);
    return value == null ? null : value.toLocalDateTime();
  }

  private static long requiredKey(KeyHolder holder) {
    Number key = holder.getKey();
    if (key == null) throw new IllegalStateException("Database did not return generated key");
    return key.longValue();
  }

  private static Object nullable(Object value) {
    return value == null ? "" : value;
  }

  private static <T> Optional<T> first(List<T> values) {
    return values.isEmpty() ? Optional.empty() : Optional.of(values.get(0));
  }
}
