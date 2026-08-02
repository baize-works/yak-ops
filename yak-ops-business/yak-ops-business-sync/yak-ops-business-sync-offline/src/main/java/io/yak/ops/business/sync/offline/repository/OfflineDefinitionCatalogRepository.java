package io.yak.ops.business.sync.offline.repository;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

/**
 * 持久化不可变离线任务版本。
 *
 * @author weifuwan
 */
@ConditionalOnOfflineSyncEnabled
@Repository
public class OfflineDefinitionCatalogRepository {

  private final JdbcTemplate jdbc;

  public OfflineDefinitionCatalogRepository(
      @Qualifier("offlineSyncDataSource") DataSource dataSource) {
    this.jdbc = new JdbcTemplate(dataSource);
  }

  /** 兼容现有保存链路；能力要求可在保存后或首次执行时回填。 */
  public Long saveVersion(
      Long definitionId,
      int version,
      String definitionJson,
      String jobSpecJson,
      String configDigest) {
    return saveVersion(
        definitionId,
        version,
        definitionJson,
        jobSpecJson,
        configDigest,
        null);
  }

  public Long saveVersion(
      Long definitionId,
      int version,
      String definitionJson,
      String jobSpecJson,
      String configDigest,
      String capabilityRequirementsJson) {
    KeyHolder keyHolder = new GeneratedKeyHolder();
    jdbc.update(
        connection -> {
          PreparedStatement statement = connection.prepareStatement(
              "INSERT INTO yak_offline_job_version "
                  + "(job_definition_id, version_no, definition_json, job_spec_json, "
                  + "hocon_config, config_digest, capability_requirements_json, create_time) "
                  + "VALUES (?, ?, ?, ?, NULL, ?, ?, ?)",
              Statement.RETURN_GENERATED_KEYS);
          statement.setLong(1, definitionId);
          statement.setInt(2, version);
          statement.setString(3, definitionJson);
          statement.setString(4, jobSpecJson);
          statement.setString(5, configDigest);
          statement.setString(6, capabilityRequirementsJson);
          statement.setTimestamp(7, Timestamp.valueOf(LocalDateTime.now()));
          return statement;
        },
        keyHolder);
    Number key = keyHolder.getKey();
    if (key == null) {
      throw new IllegalStateException("保存离线任务版本后未返回版本 ID");
    }
    return key.longValue();
  }

  /** 只回填派生元数据，不修改 JobSpec、配置摘要或版本号。 */
  public void backfillCapabilityRequirements(
      Long definitionId,
      Long versionId,
      String capabilityRequirementsJson) {
    if (definitionId == null || versionId == null || capabilityRequirementsJson == null) {
      return;
    }
    jdbc.update(
        "UPDATE yak_offline_job_version SET capability_requirements_json = ? "
            + "WHERE id = ? AND capability_requirements_json IS NULL",
        capabilityRequirementsJson,
        versionId);
    jdbc.update(
        "UPDATE yak_offline_job_definition SET capability_requirements_json = ?, update_time = ? "
            + "WHERE id = ?",
        capabilityRequirementsJson,
        Timestamp.valueOf(LocalDateTime.now()),
        definitionId);
  }

  public DefinitionVersion findCurrentVersion(Long definitionId, Long currentVersionId) {
    String sql;
    Object[] arguments;
    if (currentVersionId != null) {
      sql = selectSql() + " WHERE id = ?";
      arguments = new Object[] {currentVersionId};
    } else {
      sql = selectSql() + " WHERE job_definition_id = ? ORDER BY version_no DESC LIMIT 1";
      arguments = new Object[] {definitionId};
    }
    try {
      return jdbc.queryForObject(sql, (resultSet, rowNum) -> map(resultSet), arguments);
    } catch (EmptyResultDataAccessException exception) {
      return null;
    }
  }

  public List<DefinitionVersion> listVersions(Long definitionId) {
    return jdbc.query(
        selectSql() + " WHERE job_definition_id = ? ORDER BY version_no DESC",
        (resultSet, rowNum) -> map(resultSet),
        definitionId);
  }

  private String selectSql() {
    return "SELECT id, job_definition_id, version_no, definition_json, job_spec_json, "
        + "hocon_config, config_digest, capability_requirements_json, create_time "
        + "FROM yak_offline_job_version";
  }

  private DefinitionVersion map(java.sql.ResultSet resultSet) throws java.sql.SQLException {
    return new DefinitionVersion(
        resultSet.getLong("id"),
        resultSet.getLong("job_definition_id"),
        resultSet.getInt("version_no"),
        resultSet.getString("definition_json"),
        resultSet.getString("job_spec_json"),
        resultSet.getString("hocon_config"),
        resultSet.getString("config_digest"),
        resultSet.getString("capability_requirements_json"),
        resultSet.getTimestamp("create_time").toLocalDateTime());
  }

  public static final class DefinitionVersion {
    private final Long id;
    private final Long jobDefinitionId;
    private final int versionNo;
    private final String definitionJson;
    private final String jobSpecJson;
    private final String legacyHoconConfig;
    private final String configDigest;
    private final String capabilityRequirementsJson;
    private final LocalDateTime createTime;

    public DefinitionVersion(
        Long id,
        Long jobDefinitionId,
        int versionNo,
        String definitionJson,
        String jobSpecJson,
        String legacyHoconConfig,
        String configDigest,
        String capabilityRequirementsJson,
        LocalDateTime createTime) {
      this.id = id;
      this.jobDefinitionId = jobDefinitionId;
      this.versionNo = versionNo;
      this.definitionJson = definitionJson;
      this.jobSpecJson = jobSpecJson;
      this.legacyHoconConfig = legacyHoconConfig;
      this.configDigest = configDigest;
      this.capabilityRequirementsJson = capabilityRequirementsJson;
      this.createTime = createTime;
    }

    public Long getId() { return id; }
    public Long getJobDefinitionId() { return jobDefinitionId; }
    public int getVersionNo() { return versionNo; }
    public String getDefinitionJson() { return definitionJson; }
    public String getJobSpecJson() { return jobSpecJson; }
    public String getLegacyHoconConfig() { return legacyHoconConfig; }
    public String getConfigDigest() { return configDigest; }
    public String getCapabilityRequirementsJson() { return capabilityRequirementsJson; }
    public LocalDateTime getCreateTime() { return createTime; }
  }
}
