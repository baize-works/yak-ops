package io.yak.ops.business.sync.realtime.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import io.yak.ops.business.sync.realtime.config.ConditionalOnRealtimeSyncEnabled;
import io.yak.ops.business.sync.realtime.dao.mapper.FlinkCdcVersionMapper;
import io.yak.ops.business.sync.realtime.dao.mapper.RealtimeEnvironmentMapper;
import io.yak.ops.business.sync.realtime.dao.mapper.RealtimeJobMapper;
import io.yak.ops.business.sync.realtime.model.po.FlinkCdcVersionPO;
import io.yak.ops.business.sync.realtime.model.po.RealtimeEnvironmentPO;
import io.yak.ops.business.sync.realtime.model.po.RealtimeJobPO;
import io.yak.ops.business.sync.realtime.model.request.FlinkCdcVersionRequest;
import io.yak.ops.business.sync.realtime.util.SemanticVersion;
import java.util.Date;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Flink CDC 多版本目录服务。 */
@ConditionalOnRealtimeSyncEnabled
@Service
@RequiredArgsConstructor
public class FlinkCdcVersionService {

  private final FlinkCdcVersionMapper mapper;
  private final RealtimeEnvironmentMapper environmentMapper;
  private final RealtimeJobMapper jobMapper;

  public List<FlinkCdcVersionPO> list() {
    return mapper.selectList(new LambdaQueryWrapper<FlinkCdcVersionPO>()
        .orderByDesc(FlinkCdcVersionPO::getDefaultVersion)
        .orderByDesc(FlinkCdcVersionPO::getId));
  }

  public FlinkCdcVersionPO get(Long id) {
    FlinkCdcVersionPO version = mapper.selectById(id);
    if (version == null) {
      throw new IllegalArgumentException("Flink CDC 版本不存在：" + id);
    }
    return version;
  }

  @Transactional(transactionManager = "realtimeSyncTransactionManager")
  public Long create(FlinkCdcVersionRequest request) {
    ensureVersionUnique(request.getVersion(), null);
    validateRange(request);
    Date now = new Date();
    FlinkCdcVersionPO version = new FlinkCdcVersionPO();
    apply(version, request);
    version.setDefaultVersion(false);
    version.setCreatedAt(now);
    version.setUpdatedAt(now);
    mapper.insert(version);
    if (mapper.selectCount(null) == 1) {
      setDefault(version.getId());
    }
    return version.getId();
  }

  @Transactional(transactionManager = "realtimeSyncTransactionManager")
  public void update(Long id, FlinkCdcVersionRequest request) {
    get(id);
    ensureVersionUnique(request.getVersion(), id);
    validateRange(request);
    FlinkCdcVersionPO version = new FlinkCdcVersionPO();
    version.setId(id);
    apply(version, request);
    version.setUpdatedAt(new Date());
    mapper.updateById(version);
  }

  @Transactional(transactionManager = "realtimeSyncTransactionManager")
  public void delete(Long id) {
    FlinkCdcVersionPO version = get(id);
    if (Boolean.TRUE.equals(version.getDefaultVersion())) {
      throw new IllegalStateException("默认 Flink CDC 版本不能删除");
    }
    long environmentCount = environmentMapper.selectCount(
        new LambdaQueryWrapper<RealtimeEnvironmentPO>()
            .eq(RealtimeEnvironmentPO::getCdcVersionId, id));
    long jobCount = jobMapper.selectCount(
        new LambdaQueryWrapper<RealtimeJobPO>()
            .eq(RealtimeJobPO::getCdcVersionId, id));
    if (environmentCount > 0 || jobCount > 0) {
      throw new IllegalStateException("Flink CDC 版本已被运行环境或任务引用，不能删除");
    }
    mapper.deleteById(id);
  }

  @Transactional(transactionManager = "realtimeSyncTransactionManager")
  public void setDefault(Long id) {
    get(id);
    mapper.update(null, new com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper<FlinkCdcVersionPO>()
        .eq(FlinkCdcVersionPO::getDefaultVersion, true)
        .set(FlinkCdcVersionPO::getDefaultVersion, false));
    mapper.update(null, new com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper<FlinkCdcVersionPO>()
        .eq(FlinkCdcVersionPO::getId, id)
        .set(FlinkCdcVersionPO::getDefaultVersion, true)
        .set(FlinkCdcVersionPO::getEnabled, true)
        .set(FlinkCdcVersionPO::getUpdatedAt, new Date()));
  }

  public FlinkCdcVersionPO requireEnabled(Long id) {
    FlinkCdcVersionPO version = get(id);
    if (!Boolean.TRUE.equals(version.getEnabled())) {
      throw new IllegalStateException("Flink CDC 版本已停用：" + version.getVersion());
    }
    return version;
  }

  public void validateCompatibility(FlinkCdcVersionPO version, String flinkVersion) {
    if (!SemanticVersion.between(
        flinkVersion, version.getFlinkMinVersion(), version.getFlinkMaxVersion())) {
      throw new IllegalArgumentException(
          "Flink " + flinkVersion + " 不在 CDC " + version.getVersion()
              + " 支持范围 [" + version.getFlinkMinVersion() + ", "
              + version.getFlinkMaxVersion() + "] 内");
    }
  }

  private void ensureVersionUnique(String version, Long excludedId) {
    LambdaQueryWrapper<FlinkCdcVersionPO> query = new LambdaQueryWrapper<FlinkCdcVersionPO>()
        .eq(FlinkCdcVersionPO::getVersion, version.trim());
    if (excludedId != null) {
      query.ne(FlinkCdcVersionPO::getId, excludedId);
    }
    if (mapper.selectCount(query) > 0) {
      throw new IllegalArgumentException("Flink CDC 版本已存在：" + version);
    }
  }

  private static void validateRange(FlinkCdcVersionRequest request) {
    if (SemanticVersion.parse(request.getFlinkMinVersion())
        .compareTo(SemanticVersion.parse(request.getFlinkMaxVersion())) > 0) {
      throw new IllegalArgumentException("Flink 最低版本不能高于最高版本");
    }
  }

  private static void apply(FlinkCdcVersionPO version, FlinkCdcVersionRequest request) {
    version.setVersion(request.getVersion().trim());
    version.setDisplayName(request.getDisplayName().trim());
    version.setFlinkMinVersion(request.getFlinkMinVersion().trim());
    version.setFlinkMaxVersion(request.getFlinkMaxVersion().trim());
    version.setCdcHome(trimToNull(request.getCdcHome()));
    version.setConnectorDirectory(trimToNull(request.getConnectorDirectory()));
    version.setDescription(trimToNull(request.getDescription()));
    version.setEnabled(request.isEnabled());
  }

  private static String trimToNull(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }
}
