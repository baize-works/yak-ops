package io.yak.ops.business.development.service;

import io.yak.ops.business.development.api.DataDevelopmentPlatformApi.PlatformSnapshotView;
import io.yak.ops.business.development.api.DataDevelopmentPlatformApi.SaveEngineEndpointRequest;
import io.yak.ops.business.development.api.DataDevelopmentPlatformApi.SaveEnvironmentRequest;
import io.yak.ops.business.development.api.DataDevelopmentPlatformApi.SaveParameterTemplateRequest;
import io.yak.ops.business.development.api.DataDevelopmentPlatformApi.SaveSecretRequest;
import io.yak.ops.business.development.config.ConditionalOnDataDevelopmentEnabled;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.AuditEntry;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.EngineEndpoint;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.Environment;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.EnvironmentType;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.ParameterTemplate;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.PlatformOverview;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.ProbeType;
import io.yak.ops.business.development.domain.DataDevelopmentPlatformModel.SecretMetadata;
import io.yak.ops.business.development.repository.DataDevelopmentPlatformRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/** Application service for platform configuration, governance and observability. */
@ConditionalOnDataDevelopmentEnabled
@Service
public  class DataDevelopmentPlatformService {

  private final DataDevelopmentPlatformRepository repository;
  private final DataDevelopmentJsonCodec json;
  private final DataDevelopmentSecretCipher cipher;
  private final DataDevelopmentPlatformAuditService audit;
  private final DataDevelopmentEngineHealthService health;

  public DataDevelopmentPlatformService(
      DataDevelopmentPlatformRepository repository,
      DataDevelopmentJsonCodec json,
      DataDevelopmentSecretCipher cipher,
      DataDevelopmentPlatformAuditService audit,
      DataDevelopmentEngineHealthService health) {
    this.repository = repository;
    this.json = json;
    this.cipher = cipher;
    this.audit = audit;
    this.health = health;
  }

  public PlatformSnapshotView snapshot() {
    return new PlatformSnapshotView(overview(), listEnvironments(), listSecrets(),
        listParameterTemplates(), listEngines(), listAudit(100), cipher.configured());
  }

  public PlatformOverview overview() {
    return repository.overview(LocalDateTime.now().minusHours(24));
  }

  public List<Environment> listEnvironments() { return repository.listEnvironments(); }
  public List<SecretMetadata> listSecrets() { return repository.listSecrets(); }
  public List<ParameterTemplate> listParameterTemplates() {
    return repository.listParameterTemplates();
  }
  public List<EngineEndpoint> listEngines() { return repository.listEngineEndpoints(); }
  public List<AuditEntry> listAudit(int limit) { return repository.listAudit(limit); }

  @Transactional(transactionManager = "dataDevelopmentTransactionManager", rollbackFor = Exception.class)
  public Environment saveEnvironment(SaveEnvironmentRequest request, String operator) {
    String type = enumName(EnvironmentType.class, request.environmentType(), "环境类型");
    LocalDateTime now = LocalDateTime.now();
    long id;
    if (request.id() == null) {
      id = repository.insertEnvironment(require(request.code(), "环境编码"),
          require(request.name(), "环境名称"), type, trim(request.description()), request.enabled(),
          json.write(requireObject(request.variables(), "环境变量")), actor(operator), now);
    } else {
      id = request.id();
      int changed = repository.updateEnvironment(id, require(request.code(), "环境编码"),
          require(request.name(), "环境名称"), type, trim(request.description()), request.enabled(),
          json.write(requireObject(request.variables(), "环境变量")),
          request.lockVersion() == null ? 0 : request.lockVersion(), actor(operator), now);
      if (changed != 1) throw new IllegalStateException("运行环境已被其他用户更新，请刷新后重试");
    }
    audit.record("ENVIRONMENT_SAVED", "ENVIRONMENT", id,
        Map.of("code", request.code(), "enabled", request.enabled()), operator);
    return repository.findEnvironment(id).orElseThrow();
  }

  @Transactional(transactionManager = "dataDevelopmentTransactionManager", rollbackFor = Exception.class)
  public void deleteEnvironment(long id, String operator) {
    Environment value = repository.findEnvironment(id)
        .orElseThrow(() -> new IllegalArgumentException("运行环境不存在：" + id));
    repository.deleteSecretsByEnvironment(id);
    repository.deleteEnvironment(id);
    audit.record("ENVIRONMENT_DELETED", "ENVIRONMENT", id,
        Map.of("code", value.code()), operator);
  }

  @Transactional(transactionManager = "dataDevelopmentTransactionManager", rollbackFor = Exception.class)
  public SecretMetadata saveSecret(SaveSecretRequest request, String operator) {
    long environmentId = request.environmentId() == null ? 0L : request.environmentId();
    if (environmentId > 0 && repository.findEnvironment(environmentId).isEmpty()) {
      throw new IllegalArgumentException("运行环境不存在：" + environmentId);
    }
    String value = require(request.secretValue(), "密钥值");
    long id = repository.upsertSecret(request.id(), environmentId,
        require(request.secretKey(), "密钥名称"), trim(request.description()),
        cipher.encrypt(value), cipher.digest(value), actor(operator), LocalDateTime.now());
    audit.record("SECRET_SAVED", "SECRET", id,
        Map.of("environmentId", environmentId, "secretKey", request.secretKey()), operator);
    return repository.listSecrets().stream().filter(item -> item.id() == id).findFirst().orElseThrow();
  }

  @Transactional(transactionManager = "dataDevelopmentTransactionManager", rollbackFor = Exception.class)
  public void deleteSecret(long id, String operator) {
    repository.deleteSecret(id);
    audit.record("SECRET_DELETED", "SECRET", id, Map.of(), operator);
  }

  @Transactional(transactionManager = "dataDevelopmentTransactionManager", rollbackFor = Exception.class)
  public ParameterTemplate saveParameterTemplate(
      SaveParameterTemplateRequest request, String operator) {
    LocalDateTime now = LocalDateTime.now();
    long id;
    if (request.id() == null) {
      id = repository.insertParameterTemplate(require(request.code(), "模板编码"),
          require(request.name(), "模板名称"), trim(request.description()), request.enabled(),
          json.write(requireObject(request.parameters(), "模板参数")), actor(operator), now);
    } else {
      id = request.id();
      int changed = repository.updateParameterTemplate(id, require(request.code(), "模板编码"),
          require(request.name(), "模板名称"), trim(request.description()), request.enabled(),
          json.write(requireObject(request.parameters(), "模板参数")),
          request.lockVersion() == null ? 0 : request.lockVersion(), actor(operator), now);
      if (changed != 1) throw new IllegalStateException("参数模板已被其他用户更新，请刷新后重试");
    }
    audit.record("PARAMETER_TEMPLATE_SAVED", "PARAMETER_TEMPLATE", id,
        Map.of("code", request.code(), "enabled", request.enabled()), operator);
    return repository.findParameterTemplate(id).orElseThrow();
  }

  @Transactional(transactionManager = "dataDevelopmentTransactionManager", rollbackFor = Exception.class)
  public void deleteParameterTemplate(long id, String operator) {
    repository.deleteParameterTemplate(id);
    audit.record("PARAMETER_TEMPLATE_DELETED", "PARAMETER_TEMPLATE", id, Map.of(), operator);
  }

  @Transactional(transactionManager = "dataDevelopmentTransactionManager", rollbackFor = Exception.class)
  public EngineEndpoint saveEngine(SaveEngineEndpointRequest request, String operator) {
    String probeType = enumName(ProbeType.class, request.probeType(), "探测类型");
    LocalDateTime now = LocalDateTime.now();
    long id;
    if (request.id() == null) {
      id = repository.insertEngineEndpoint(require(request.taskType(), "任务类型").toUpperCase(Locale.ROOT),
          require(request.code(), "端点编码"), require(request.name(), "端点名称"), probeType,
          trim(request.endpoint()), request.enabled(),
          json.write(requireObject(request.config(), "端点配置")), actor(operator), now);
    } else {
      id = request.id();
      int changed = repository.updateEngineEndpoint(id,
          require(request.taskType(), "任务类型").toUpperCase(Locale.ROOT),
          require(request.code(), "端点编码"), require(request.name(), "端点名称"), probeType,
          trim(request.endpoint()), request.enabled(),
          json.write(requireObject(request.config(), "端点配置")),
          request.lockVersion() == null ? 0 : request.lockVersion(), actor(operator), now);
      if (changed != 1) throw new IllegalStateException("引擎端点已被其他用户更新，请刷新后重试");
    }
    audit.record("ENGINE_ENDPOINT_SAVED", "ENGINE_ENDPOINT", id,
        Map.of("code", request.code(), "taskType", request.taskType()), operator);
    return repository.findEngineEndpoint(id).orElseThrow();
  }

  @Transactional(transactionManager = "dataDevelopmentTransactionManager", rollbackFor = Exception.class)
  public void deleteEngine(long id, String operator) {
    repository.deleteEngineEndpoint(id);
    audit.record("ENGINE_ENDPOINT_DELETED", "ENGINE_ENDPOINT", id, Map.of(), operator);
  }

  public EngineEndpoint checkEngine(long id, String operator) {
    EngineEndpoint result = health.check(id);
    audit.record("ENGINE_HEALTH_CHECKED", "ENGINE_ENDPOINT", id,
        Map.of("status", result.healthStatus().name()), operator);
    return result;
  }

  public List<EngineEndpoint> checkAllEngines(String operator) {
    List<EngineEndpoint> result = health.checkAll();
    audit.record("ENGINE_HEALTH_CHECKED_ALL", "ENGINE_ENDPOINT", null,
        Map.of("count", result.size()), operator);
    return result;
  }

  private com.fasterxml.jackson.databind.JsonNode requireObject(
      com.fasterxml.jackson.databind.JsonNode value, String label) {
    if (value == null || !value.isObject()) throw new IllegalArgumentException(label + "必须是 JSON 对象");
    return value;
  }

  private static <E extends Enum<E>> String enumName(Class<E> type, String value, String label) {
    try { return Enum.valueOf(type, require(value, label).toUpperCase(Locale.ROOT)).name(); }
    catch (IllegalArgumentException error) { throw new IllegalArgumentException("不支持的" + label + "：" + value); }
  }

  private static String require(String value, String label) {
    if (!StringUtils.hasText(value)) throw new IllegalArgumentException(label + "不能为空");
    return value.trim();
  }

  private static String trim(String value) { return StringUtils.hasText(value) ? value.trim() : null; }
  private static String actor(String value) { return StringUtils.hasText(value) ? value.trim() : "system"; }
}
