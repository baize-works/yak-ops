package io.yak.ops.business.sync.realtime.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import io.yak.ops.business.sync.realtime.config.ConditionalOnRealtimeSyncEnabled;
import io.yak.ops.business.sync.realtime.dao.mapper.RealtimeEnvironmentMapper;
import io.yak.ops.business.sync.realtime.dao.mapper.RealtimeJobMapper;
import io.yak.ops.business.sync.realtime.model.enums.DeploymentMode;
import io.yak.ops.business.sync.realtime.model.po.FlinkCdcVersionPO;
import io.yak.ops.business.sync.realtime.model.po.RealtimeEnvironmentPO;
import io.yak.ops.business.sync.realtime.model.po.RealtimeJobPO;
import io.yak.ops.business.sync.realtime.model.request.RealtimeEnvironmentRequest;
import io.yak.ops.business.sync.realtime.model.response.ValidationResult;
import io.yak.ops.business.sync.realtime.util.RealtimeJsonCodec;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Flink CDC 运行环境服务。 */
@ConditionalOnRealtimeSyncEnabled
@Service
@RequiredArgsConstructor
public class RealtimeEnvironmentService {

  private final RealtimeEnvironmentMapper mapper;
  private final RealtimeJobMapper jobMapper;
  private final FlinkCdcVersionService versionService;
  private final RealtimeJsonCodec jsonCodec;

  public List<RealtimeEnvironmentPO> list() {
    return mapper.selectList(new LambdaQueryWrapper<RealtimeEnvironmentPO>()
        .orderByDesc(RealtimeEnvironmentPO::getId));
  }

  public RealtimeEnvironmentPO get(Long id) {
    RealtimeEnvironmentPO environment = mapper.selectById(id);
    if (environment == null) {
      throw new IllegalArgumentException("实时同步环境不存在：" + id);
    }
    return environment;
  }

  public Map<String, String> deploymentConfig(RealtimeEnvironmentPO environment) {
    return jsonCodec.readMap(environment.getDeploymentConfigJson());
  }

  @Transactional(transactionManager = "realtimeSyncTransactionManager")
  public Long create(RealtimeEnvironmentRequest request) {
    ensureNameUnique(request.getName(), null);
    validateVersion(request);
    Date now = new Date();
    RealtimeEnvironmentPO environment = new RealtimeEnvironmentPO();
    apply(environment, request);
    environment.setCreatedAt(now);
    environment.setUpdatedAt(now);
    mapper.insert(environment);
    return environment.getId();
  }

  @Transactional(transactionManager = "realtimeSyncTransactionManager")
  public void update(Long id, RealtimeEnvironmentRequest request) {
    get(id);
    ensureNameUnique(request.getName(), id);
    validateVersion(request);
    RealtimeEnvironmentPO environment = new RealtimeEnvironmentPO();
    environment.setId(id);
    apply(environment, request);
    environment.setUpdatedAt(new Date());
    mapper.updateById(environment);
  }

  @Transactional(transactionManager = "realtimeSyncTransactionManager")
  public void delete(Long id) {
    get(id);
    long jobCount = jobMapper.selectCount(new LambdaQueryWrapper<RealtimeJobPO>()
        .eq(RealtimeJobPO::getEnvironmentId, id));
    if (jobCount > 0) {
      throw new IllegalStateException("运行环境已被实时同步任务引用，不能删除");
    }
    mapper.deleteById(id);
  }

  public RealtimeEnvironmentPO requireEnabled(Long id) {
    RealtimeEnvironmentPO environment = get(id);
    if (!Boolean.TRUE.equals(environment.getEnabled())) {
      throw new IllegalStateException("实时同步环境已停用：" + environment.getName());
    }
    return environment;
  }

  public ValidationResult check(Long id) {
    RealtimeEnvironmentPO environment = get(id);
    FlinkCdcVersionPO version = versionService.requireEnabled(environment.getCdcVersionId());
    List<String> messages = new ArrayList<>();
    try {
      versionService.validateCompatibility(version, environment.getFlinkVersion());
    } catch (IllegalArgumentException exception) {
      messages.add(exception.getMessage());
    }
    DeploymentMode mode = DeploymentMode.valueOf(environment.getDeploymentMode());
    Map<String, String> config = deploymentConfig(environment);
    if (mode.isOperator()) {
      requireConfig(config, "image", messages);
      requireConfig(config, "flinkVersion", messages);
      if (environment.getNamespace() == null || environment.getNamespace().isBlank()) {
        messages.add("Kubernetes Operator 环境必须配置 namespace");
      }
    } else {
      Path cdcScript = version.getCdcHome() == null
          ? null
          : Path.of(version.getCdcHome(), "bin", "flink-cdc.sh");
      if (cdcScript == null || !Files.isRegularFile(cdcScript) || !Files.isExecutable(cdcScript)) {
        messages.add("Flink CDC 提交脚本不存在或不可执行：" + cdcScript);
      }
      if (environment.getFlinkHome() == null || environment.getFlinkHome().isBlank()) {
        messages.add("CLI 部署环境必须配置 flinkHome");
      }
    }
    return messages.isEmpty()
        ? ValidationResult.success()
        : ValidationResult.failure(messages);
  }

  private void validateVersion(RealtimeEnvironmentRequest request) {
    FlinkCdcVersionPO version = versionService.requireEnabled(request.getCdcVersionId());
    versionService.validateCompatibility(version, request.getFlinkVersion());
  }

  private void ensureNameUnique(String name, Long excludedId) {
    LambdaQueryWrapper<RealtimeEnvironmentPO> query =
        new LambdaQueryWrapper<RealtimeEnvironmentPO>()
            .eq(RealtimeEnvironmentPO::getName, name.trim());
    if (excludedId != null) {
      query.ne(RealtimeEnvironmentPO::getId, excludedId);
    }
    if (mapper.selectCount(query) > 0) {
      throw new IllegalArgumentException("实时同步环境名称已存在：" + name);
    }
  }

  private void apply(RealtimeEnvironmentPO environment, RealtimeEnvironmentRequest request) {
    environment.setName(request.getName().trim());
    environment.setDeploymentMode(request.getDeploymentMode().name());
    environment.setFlinkVersion(request.getFlinkVersion().trim());
    environment.setCdcVersionId(request.getCdcVersionId());
    environment.setFlinkHome(trimToNull(request.getFlinkHome()));
    environment.setRestAddress(trimToNull(request.getRestAddress()));
    environment.setClusterId(trimToNull(request.getClusterId()));
    environment.setNamespace(trimToNull(request.getNamespace()));
    environment.setDeploymentConfigJson(jsonCodec.writeMap(request.getDeploymentConfig()));
    environment.setEnabled(request.isEnabled());
  }

  private static void requireConfig(
      Map<String, String> config, String key, List<String> messages) {
    if (config.getOrDefault(key, "").isBlank()) {
      messages.add("部署配置缺少 " + key);
    }
  }

  private static String trimToNull(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }
}
