package io.yak.ops.business.development.repository;

import io.yak.ops.business.development.domain.DataDevelopmentModel.Draft;
import io.yak.ops.business.development.domain.DataDevelopmentModel.Execution;
import io.yak.ops.business.development.domain.DataDevelopmentModel.ExecutionSourceType;
import io.yak.ops.business.development.domain.DataDevelopmentModel.ExecutionStatus;
import io.yak.ops.business.development.domain.DataDevelopmentModel.Project;
import io.yak.ops.business.development.domain.DataDevelopmentModel.Resource;
import io.yak.ops.business.development.domain.DataDevelopmentModel.ResourceKind;
import io.yak.ops.business.development.domain.DataDevelopmentModel.Task;
import io.yak.ops.business.development.domain.DataDevelopmentModel.TaskStatus;
import io.yak.ops.business.development.domain.DataDevelopmentModel.Version;
import io.yak.ops.business.development.service.DataDevelopmentJsonCodec;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;

/** JDBC persistence adapter for the data-development control plane. */
public final class DataDevelopmentRepository {

  private final NamedParameterJdbcTemplate jdbc;
  private final DataDevelopmentJsonCodec json;

  public DataDevelopmentRepository(NamedParameterJdbcTemplate jdbc, DataDevelopmentJsonCodec json) {
    this.jdbc = jdbc;
    this.json = json;
  }

  public long insertProject(String code, String name, String description, String operator, LocalDateTime now) {
    return insert("""
        INSERT INTO yak_dev_project(code,name,description,created_by,created_at,updated_at)
        VALUES(:code,:name,:description,:operator,:now,:now)
        """, p().addValue("code", code).addValue("name", name).addValue("description", description)
        .addValue("operator", operator).addValue("now", ts(now)));
  }

  public List<Project> listProjects() {
    return jdbc.query("SELECT * FROM yak_dev_project ORDER BY updated_at DESC,id DESC", p(), this::project);
  }

  public Optional<Project> findProject(long id) {
    return one(jdbc.query("SELECT * FROM yak_dev_project WHERE id=:id", p("id", id), this::project));
  }

  public long insertResource(long projectId, Long parentId, ResourceKind kind, String name,
      String description, int sortOrder, String operator, LocalDateTime now) {
    try {
      return insert("""
          INSERT INTO yak_dev_resource(project_id,parent_id,resource_kind,name,description,sort_order,
            owner_id,created_by,updated_by,deleted,lock_version,created_at,updated_at)
          VALUES(:projectId,:parentId,:kind,:name,:description,:sortOrder,
            :operator,:operator,:operator,0,0,:now,:now)
          """, p().addValue("projectId", projectId).addValue("parentId", parent(parentId))
          .addValue("kind", kind.name()).addValue("name", name).addValue("description", description)
          .addValue("sortOrder", sortOrder).addValue("operator", operator).addValue("now", ts(now)));
    } catch (DataIntegrityViolationException exception) {
      throw new IllegalArgumentException("同一目录下已存在同名资源：" + name, exception);
    }
  }

  public List<Resource> listResources(long projectId) {
    return jdbc.query("""
        SELECT * FROM yak_dev_resource WHERE project_id=:projectId AND deleted=0
        ORDER BY parent_id,sort_order,name,id
        """, p("projectId", projectId), this::resource);
  }

  public Optional<Resource> findResource(long id) {
    return one(jdbc.query("SELECT * FROM yak_dev_resource WHERE id=:id AND deleted=0",
        p("id", id), this::resource));
  }

  public int updateResource(long id, String name, String description, int sortOrder,
      int lockVersion, String operator, LocalDateTime now) {
    return jdbc.update("""
        UPDATE yak_dev_resource SET name=:name,description=:description,sort_order=:sortOrder,
          updated_by=:operator,updated_at=:now,lock_version=lock_version+1
        WHERE id=:id AND deleted=0 AND lock_version=:lockVersion
        """, p("id", id).addValue("name", name).addValue("description", description)
        .addValue("sortOrder", sortOrder).addValue("operator", operator)
        .addValue("now", ts(now)).addValue("lockVersion", lockVersion));
  }

  public int moveResource(long id, Long parentId, int sortOrder, int lockVersion,
      String operator, LocalDateTime now) {
    return jdbc.update("""
        UPDATE yak_dev_resource SET parent_id=:parentId,sort_order=:sortOrder,
          updated_by=:operator,updated_at=:now,lock_version=lock_version+1
        WHERE id=:id AND deleted=0 AND lock_version=:lockVersion
        """, p("id", id).addValue("parentId", parent(parentId)).addValue("sortOrder", sortOrder)
        .addValue("operator", operator).addValue("now", ts(now)).addValue("lockVersion", lockVersion));
  }

  public int softDeleteResource(long id, String operator, LocalDateTime now) {
    return jdbc.update("""
        UPDATE yak_dev_resource SET deleted=1,updated_by=:operator,updated_at=:now,
          lock_version=lock_version+1 WHERE id=:id AND deleted=0
        """, p("id", id).addValue("operator", operator).addValue("now", ts(now)));
  }

  public boolean hasChildren(long id) {
    Integer count = jdbc.queryForObject(
        "SELECT COUNT(1) FROM yak_dev_resource WHERE parent_id=:id AND deleted=0", p("id", id), Integer.class);
    return count != null && count > 0;
  }

  public void insertTask(long id, long projectId, String taskType, String pluginVersion,
      int schemaVersion, String engineType, LocalDateTime now) {
    jdbc.update("""
        INSERT INTO yak_dev_task(id,project_id,task_type,plugin_version,schema_version,status,
          draft_revision,published_version_id,engine_type,created_at,updated_at)
        VALUES(:id,:projectId,:taskType,:pluginVersion,:schemaVersion,'DRAFT',0,NULL,:engineType,:now,:now)
        """, p("id", id).addValue("projectId", projectId).addValue("taskType", taskType)
        .addValue("pluginVersion", pluginVersion).addValue("schemaVersion", schemaVersion)
        .addValue("engineType", engineType).addValue("now", ts(now)));
  }

  public Optional<Task> findTask(long id) {
    return one(jdbc.query("SELECT * FROM yak_dev_task WHERE id=:id", p("id", id), this::task));
  }

  public Optional<Task> findTaskForUpdate(long id) {
    return one(jdbc.query("SELECT * FROM yak_dev_task WHERE id=:id FOR UPDATE", p("id", id), this::task));
  }

  public void insertDraft(long taskId, String pluginVersion, int schemaVersion,
      String definition, String digest, String operator, LocalDateTime now) {
    jdbc.update("""
        INSERT INTO yak_dev_task_draft(task_id,revision,plugin_version,schema_version,
          definition_json,content_digest,updated_by,updated_at)
        VALUES(:taskId,0,:pluginVersion,:schemaVersion,:definition,:digest,:operator,:now)
        """, p("taskId", taskId).addValue("pluginVersion", pluginVersion)
        .addValue("schemaVersion", schemaVersion).addValue("definition", definition)
        .addValue("digest", digest).addValue("operator", operator).addValue("now", ts(now)));
  }

  public Optional<Draft> findDraft(long taskId) {
    return one(jdbc.query("SELECT * FROM yak_dev_task_draft WHERE task_id=:taskId",
        p("taskId", taskId), this::draft));
  }

  public Optional<Draft> findDraftForUpdate(long taskId) {
    return one(jdbc.query("SELECT * FROM yak_dev_task_draft WHERE task_id=:taskId FOR UPDATE",
        p("taskId", taskId), this::draft));
  }

  public int updateDraft(long taskId, long baseRevision, long nextRevision, String pluginVersion,
      int schemaVersion, String definition, String digest, String operator, LocalDateTime now) {
    return jdbc.update("""
        UPDATE yak_dev_task_draft SET revision=:nextRevision,plugin_version=:pluginVersion,
          schema_version=:schemaVersion,definition_json=:definition,content_digest=:digest,
          updated_by=:operator,updated_at=:now
        WHERE task_id=:taskId AND revision=:baseRevision
        """, p("taskId", taskId).addValue("baseRevision", baseRevision)
        .addValue("nextRevision", nextRevision).addValue("pluginVersion", pluginVersion)
        .addValue("schemaVersion", schemaVersion).addValue("definition", definition)
        .addValue("digest", digest).addValue("operator", operator).addValue("now", ts(now)));
  }

  public void updateTaskDraftMetadata(long taskId, long revision, String pluginVersion,
      int schemaVersion, LocalDateTime now) {
    jdbc.update("""
        UPDATE yak_dev_task SET draft_revision=:revision,plugin_version=:pluginVersion,
          schema_version=:schemaVersion,updated_at=:now WHERE id=:taskId
        """, p("taskId", taskId).addValue("revision", revision)
        .addValue("pluginVersion", pluginVersion).addValue("schemaVersion", schemaVersion)
        .addValue("now", ts(now)));
  }

  public void archiveTask(long taskId, LocalDateTime now) {
    jdbc.update("UPDATE yak_dev_task SET status='ARCHIVED',updated_at=:now WHERE id=:taskId",
        p("taskId", taskId).addValue("now", ts(now)));
  }

  public int nextVersionNumber(long taskId) {
    Integer value = jdbc.queryForObject(
        "SELECT COALESCE(MAX(version_no),0)+1 FROM yak_dev_task_version WHERE task_id=:taskId",
        p("taskId", taskId), Integer.class);
    return value == null ? 1 : value;
  }

  public long insertVersion(long taskId, int versionNo, String taskType, String pluginVersion,
      int schemaVersion, String definition, String compiledSpec, String inputSchema,
      String outputSchema, String digest, String comment, String operator, LocalDateTime now) {
    return insert("""
        INSERT INTO yak_dev_task_version(task_id,version_no,task_type,plugin_version,schema_version,
          definition_snapshot,compiled_spec,input_schema,output_schema,content_digest,publish_comment,
          published_by,published_at)
        VALUES(:taskId,:versionNo,:taskType,:pluginVersion,:schemaVersion,:definition,:compiledSpec,
          :inputSchema,:outputSchema,:digest,:comment,:operator,:now)
        """, p("taskId", taskId).addValue("versionNo", versionNo).addValue("taskType", taskType)
        .addValue("pluginVersion", pluginVersion).addValue("schemaVersion", schemaVersion)
        .addValue("definition", definition).addValue("compiledSpec", compiledSpec)
        .addValue("inputSchema", inputSchema).addValue("outputSchema", outputSchema)
        .addValue("digest", digest).addValue("comment", comment).addValue("operator", operator)
        .addValue("now", ts(now)));
  }

  public void updateTaskPublished(long taskId, long versionId, LocalDateTime now) {
    jdbc.update("""
        UPDATE yak_dev_task SET status='PUBLISHED',published_version_id=:versionId,updated_at=:now
        WHERE id=:taskId
        """, p("taskId", taskId).addValue("versionId", versionId).addValue("now", ts(now)));
  }

  public List<Version> listVersions(long taskId) {
    return jdbc.query("SELECT * FROM yak_dev_task_version WHERE task_id=:taskId ORDER BY version_no DESC",
        p("taskId", taskId), this::version);
  }

  public Optional<Version> findVersion(long taskId, long versionId) {
    return one(jdbc.query("SELECT * FROM yak_dev_task_version WHERE task_id=:taskId AND id=:versionId",
        p("taskId", taskId).addValue("versionId", versionId), this::version));
  }

  public long insertExecution(long taskId, ExecutionSourceType sourceType, Long draftRevision,
      Long taskVersionId, String taskType, String pluginVersion, String definition,
      String compiledSpec, String runtime, String input, String idempotencyKey,
      String operator, LocalDateTime now) {
    try {
      return insert("""
          INSERT INTO yak_dev_execution(task_id,source_type,draft_revision,task_version_id,task_type,
            plugin_version,definition_snapshot,compiled_spec_snapshot,runtime_snapshot,input_snapshot,
            status,current_attempt_no,idempotency_key,created_by,created_at)
          VALUES(:taskId,:sourceType,:draftRevision,:taskVersionId,:taskType,:pluginVersion,
            :definition,:compiledSpec,:runtime,:input,'CREATED',0,:idempotencyKey,:operator,:now)
          """, p("taskId", taskId).addValue("sourceType", sourceType.name())
          .addValue("draftRevision", draftRevision).addValue("taskVersionId", taskVersionId)
          .addValue("taskType", taskType).addValue("pluginVersion", pluginVersion)
          .addValue("definition", definition).addValue("compiledSpec", compiledSpec)
          .addValue("runtime", runtime).addValue("input", input)
          .addValue("idempotencyKey", idempotencyKey).addValue("operator", operator)
          .addValue("now", ts(now)));
    } catch (DataIntegrityViolationException exception) {
      throw new IllegalArgumentException("执行幂等键已存在：" + idempotencyKey, exception);
    }
  }

  public Optional<Execution> findExecution(long id) {
    return one(jdbc.query("SELECT * FROM yak_dev_execution WHERE id=:id", p("id", id), this::execution));
  }

  public List<Execution> listExecutions(long taskId, int limit) {
    return jdbc.query("""
        SELECT * FROM yak_dev_execution WHERE task_id=:taskId ORDER BY id DESC LIMIT :limit
        """, p("taskId", taskId).addValue("limit", Math.min(200, Math.max(1, limit))), this::execution);
  }

  public int cancelExecution(long id, LocalDateTime now) {
    return jdbc.update("""
        UPDATE yak_dev_execution SET status='CANCELED',finished_at=:now
        WHERE id=:id AND status IN ('CREATED','QUEUED','RUNNING')
        """, p("id", id).addValue("now", ts(now)));
  }

  private long insert(String sql, MapSqlParameterSource parameters) {
    KeyHolder holder = new GeneratedKeyHolder();
    jdbc.update(sql, parameters, holder, new String[] {"id"});
    Number key = holder.getKey();
    if (key == null) throw new IllegalStateException("Database did not return a generated ID");
    return key.longValue();
  }

  private Project project(ResultSet rs, int row) throws SQLException {
    return new Project(rs.getLong("id"), rs.getString("code"), rs.getString("name"),
        rs.getString("description"), rs.getString("created_by"), time(rs, "created_at"), time(rs, "updated_at"));
  }

  private Resource resource(ResultSet rs, int row) throws SQLException {
    return new Resource(rs.getLong("id"), rs.getLong("project_id"), nullableLong(rs, "parent_id"),
        ResourceKind.valueOf(rs.getString("resource_kind")), rs.getString("name"), rs.getString("description"),
        rs.getInt("sort_order"), rs.getString("owner_id"), rs.getString("created_by"), rs.getString("updated_by"),
        rs.getBoolean("deleted"), rs.getInt("lock_version"), time(rs, "created_at"), time(rs, "updated_at"));
  }

  private Task task(ResultSet rs, int row) throws SQLException {
    return new Task(rs.getLong("id"), rs.getLong("project_id"), rs.getString("task_type"),
        rs.getString("plugin_version"), rs.getInt("schema_version"), TaskStatus.valueOf(rs.getString("status")),
        rs.getLong("draft_revision"), nullableLong(rs, "published_version_id"), rs.getString("engine_type"),
        time(rs, "created_at"), time(rs, "updated_at"));
  }

  private Draft draft(ResultSet rs, int row) throws SQLException {
    return new Draft(rs.getLong("task_id"), rs.getLong("revision"), rs.getString("plugin_version"),
        rs.getInt("schema_version"), json.readTree(rs.getString("definition_json")),
        rs.getString("content_digest"), rs.getString("updated_by"), time(rs, "updated_at"));
  }

  private Version version(ResultSet rs, int row) throws SQLException {
    return new Version(rs.getLong("id"), rs.getLong("task_id"), rs.getInt("version_no"),
        rs.getString("task_type"), rs.getString("plugin_version"), rs.getInt("schema_version"),
        json.readTree(rs.getString("definition_snapshot")), json.readTree(rs.getString("compiled_spec")),
        json.readTree(rs.getString("input_schema")), json.readTree(rs.getString("output_schema")),
        rs.getString("content_digest"), rs.getString("publish_comment"), rs.getString("published_by"),
        time(rs, "published_at"));
  }

  private Execution execution(ResultSet rs, int row) throws SQLException {
    return new Execution(rs.getLong("id"), rs.getLong("task_id"),
        ExecutionSourceType.valueOf(rs.getString("source_type")), nullableLong(rs, "draft_revision"),
        nullableLong(rs, "task_version_id"), rs.getString("task_type"), rs.getString("plugin_version"),
        json.readTree(rs.getString("definition_snapshot")), json.readTree(rs.getString("compiled_spec_snapshot")),
        json.readTree(rs.getString("runtime_snapshot")), json.readTree(rs.getString("input_snapshot")),
        ExecutionStatus.valueOf(rs.getString("status")), rs.getInt("current_attempt_no"),
        rs.getString("idempotency_key"), rs.getString("created_by"), time(rs, "created_at"),
        time(rs, "started_at"), time(rs, "finished_at"), rs.getString("error_code"), rs.getString("error_message"));
  }

  private static MapSqlParameterSource p() { return new MapSqlParameterSource(); }
  private static MapSqlParameterSource p(String key, Object value) { return p().addValue(key, value); }
  private static Timestamp ts(LocalDateTime value) { return Timestamp.valueOf(value); }
  private static long parent(Long value) { return value == null ? 0L : value; }
  private static Long nullableLong(ResultSet rs, String column) throws SQLException {
    long value = rs.getLong(column); return rs.wasNull() ? null : value;
  }
  private static LocalDateTime time(ResultSet rs, String column) throws SQLException {
    Timestamp value = rs.getTimestamp(column); return value == null ? null : value.toLocalDateTime();
  }
  private static <T> Optional<T> one(List<T> values) {
    return values.isEmpty() ? Optional.empty() : Optional.of(values.getFirst());
  }
}
