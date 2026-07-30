package io.yak.ops.business.sync.realtime.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import io.yak.ops.business.sync.realtime.config.ConditionalOnRealtimeSyncEnabled;
import io.yak.ops.business.sync.realtime.dao.mapper.RealtimeDeploymentMapper;
import io.yak.ops.business.sync.realtime.dao.mapper.RealtimeJobMapper;
import io.yak.ops.business.sync.realtime.model.enums.JobState;
import io.yak.ops.business.sync.realtime.model.po.FlinkCdcVersionPO;
import io.yak.ops.business.sync.realtime.model.po.RealtimeDeploymentPO;
import io.yak.ops.business.sync.realtime.model.po.RealtimeEnvironmentPO;
import io.yak.ops.business.sync.realtime.model.po.RealtimeJobPO;
import io.yak.ops.business.sync.realtime.model.request.RealtimeJobRequest;
import io.yak.ops.business.sync.realtime.model.response.ValidationResult;
import io.yak.ops.business.sync.realtime.util.RealtimeJsonCodec;
import io.yak.ops.business.sync.realtime.validation.PipelineDefinitionValidator;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 实时同步任务定义服务。 */
@ConditionalOnRealtimeSyncEnabled
@Service
@RequiredArgsConstructor
public class RealtimeJobService {

  private final RealtimeJobMapper mapper;
  private final RealtimeDeploymentMapper deploymentMapper;
  private final RealtimeEnvironmentService environmentService;
  private final FlinkCdcVersionService versionService;
  private final PipelineDefinitionValidator pipelineValidator;
  private final RealtimeJsonCodec jsonCodec;

  public List<RealtimeJobPO> list() {
    return mapper.selectList(new LambdaQueryWrapper<RealtimeJobPO>()
        .orderByDesc(RealtimeJobPO::getId));
  }

  public RealtimeJobPO get(Long id) {
    RealtimeJobPO job = mapper.selectById(id);
    if (job == null) {
      throw new IllegalArgumentException("实时同步任务不存在：" + id);
    }
    return job;
  }

  public Map<String, String> runtimeOptions(RealtimeJobPO job) {
    return jsonCodec.readMap(job.getRuntimeOptionsJson());
  }

  @Transactional(transactionManager = "realtimeSyncTransactionManager")
  public Long create(RealtimeJobRequest request) {
    ensureNameUnique(request.getName(), null);
    validateReferences(request);
    Date now = new Date();
    RealtimeJobPO job = new RealtimeJobPO();
    apply(job, request);
    job.setState(JobState.DRAFT.name());
    job.setCreatedAt(now);
    job.setUpdatedAt(now);
    mapper.insert(job);
    return job.getId();
  }

  @Transactional(transactionManager = "realtimeSyncTransactionManager")
  public void update(Long id, RealtimeJobRequest request) {
    RealtimeJobPO existing = get(id);
    if (JobState.valueOf(existing.getState()).isRunning()) {
      throw new IllegalStateException("运行中的任务不能修改");
    }
    ensureNameUnique(request.getName(), id);
    validateReferences(request);
    RealtimeJobPO job = new RealtimeJobPO();
    job.setId(id);
    apply(job, request);
    job.setState(JobState.DRAFT.name());
    job.setUpdatedAt(new Date());
    mapper.updateById(job);
  }

  @Transactional(transactionManager = "realtimeSyncTransactionManager")
  public void delete(Long id) {
    RealtimeJobPO job = get(id);
    if (JobState.valueOf(job.getState()).isRunning()) {
      throw new IllegalStateException("运行中的任务不能删除");
    }
    long deploymentCount = deploymentMapper.selectCount(
        new LambdaQueryWrapper<RealtimeDeploymentPO>()
            .eq(RealtimeDeploymentPO::getJobId, id));
    if (deploymentCount > 0) {
      throw new IllegalStateException("任务已有部署历史，不能删除，可改为停用或归档");
    }
    mapper.deleteById(id);
  }

  @Transactional(transactionManager = "realtimeSyncTransactionManager")
  public ValidationResult validate(Long id) {
    RealtimeJobPO job = get(id);
    List<String> messages = new ArrayList<>(pipelineValidator.validate(job.getPipelineYaml()).messages());
    try {
      RealtimeEnvironmentPO environment = environmentService.requireEnabled(job.getEnvironmentId());
      FlinkCdcVersionPO version = versionService.requireEnabled(job.getCdcVersionId());
      if (!job.getCdcVersionId().equals(environment.getCdcVersionId())) {
        messages.add("任务选择的 CDC 版本与运行环境绑定版本不一致");
      }
      versionService.validateCompatibility(version, environment.getFlinkVersion());
    } catch (RuntimeException exception) {
      messages.add(exception.getMessage());
    }
    ValidationResult result = messages.isEmpty()
        ? ValidationResult.success()
        : ValidationResult.failure(messages);
    updateState(id, result.valid() ? JobState.VALIDATED : JobState.DRAFT, null);
    return result;
  }

  @Transactional(transactionManager = "realtimeSyncTransactionManager")
  public void updateState(Long id, JobState state, Long currentDeploymentId) {
    RealtimeJobPO update = new RealtimeJobPO();
    update.setId(id);
    update.setState(state.name());
    update.setCurrentDeploymentId(currentDeploymentId);
    update.setUpdatedAt(new Date());
    mapper.updateById(update);
  }

  private void validateReferences(RealtimeJobRequest request) {
    RealtimeEnvironmentPO environment = environmentService.get(request.getEnvironmentId());
    FlinkCdcVersionPO version = versionService.get(request.getCdcVersionId());
    if (!request.getCdcVersionId().equals(environment.getCdcVersionId())) {
      throw new IllegalArgumentException("任务 CDC 版本必须与运行环境绑定版本一致");
    }
    versionService.validateCompatibility(version, environment.getFlinkVersion());
  }

  private void ensureNameUnique(String name, Long excludedId) {
    LambdaQueryWrapper<RealtimeJobPO> query = new LambdaQueryWrapper<RealtimeJobPO>()
        .eq(RealtimeJobPO::getName, name.trim());
    if (excludedId != null) {
      query.ne(RealtimeJobPO::getId, excludedId);
    }
    if (mapper.selectCount(query) > 0) {
      throw new IllegalArgumentException("实时同步任务名称已存在：" + name);
    }
  }

  private void apply(RealtimeJobPO job, RealtimeJobRequest request) {
    job.setName(request.getName().trim());
    job.setDescription(trimToNull(request.getDescription()));
    job.setEnvironmentId(request.getEnvironmentId());
    job.setCdcVersionId(request.getCdcVersionId());
    job.setPipelineYaml(request.getPipelineYaml());
    job.setRuntimeOptionsJson(jsonCodec.writeMap(request.getRuntimeOptions()));
  }

  private static String trimToNull(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }
}
