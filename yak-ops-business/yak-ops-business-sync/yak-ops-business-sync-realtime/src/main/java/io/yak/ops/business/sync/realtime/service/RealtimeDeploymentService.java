package io.yak.ops.business.sync.realtime.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import io.yak.ops.business.sync.realtime.config.ConditionalOnRealtimeSyncEnabled;
import io.yak.ops.business.sync.realtime.config.RealtimeSyncProperties;
import io.yak.ops.business.sync.realtime.dao.mapper.RealtimeDeploymentMapper;
import io.yak.ops.business.sync.realtime.deployment.FlinkCdcDeploymentGateway;
import io.yak.ops.business.sync.realtime.deployment.FlinkCdcDeploymentGatewayRegistry;
import io.yak.ops.business.sync.realtime.deployment.FlinkCdcSubmission;
import io.yak.ops.business.sync.realtime.model.enums.DeploymentMode;
import io.yak.ops.business.sync.realtime.model.enums.DeploymentState;
import io.yak.ops.business.sync.realtime.model.enums.JobState;
import io.yak.ops.business.sync.realtime.model.po.FlinkCdcVersionPO;
import io.yak.ops.business.sync.realtime.model.po.RealtimeDeploymentPO;
import io.yak.ops.business.sync.realtime.model.po.RealtimeEnvironmentPO;
import io.yak.ops.business.sync.realtime.model.po.RealtimeJobPO;
import io.yak.ops.business.sync.realtime.model.request.JobSubmitRequest;
import io.yak.ops.business.sync.realtime.model.response.DeploymentResult;
import io.yak.ops.business.sync.realtime.model.response.DeploymentStatus;
import io.yak.ops.business.sync.realtime.model.response.SavepointResult;
import io.yak.ops.business.sync.realtime.model.response.ValidationResult;
import io.yak.ops.business.sync.realtime.util.RealtimeJsonCodec;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** 任务部署编排与生命周期服务。 */
@ConditionalOnRealtimeSyncEnabled
@Service
@RequiredArgsConstructor
public class RealtimeDeploymentService {

  private final RealtimeDeploymentMapper mapper;
  private final RealtimeJobService jobService;
  private final RealtimeEnvironmentService environmentService;
  private final FlinkCdcVersionService versionService;
  private final FlinkCdcDeploymentGatewayRegistry gatewayRegistry;
  private final RealtimeJsonCodec jsonCodec;
  private final RealtimeSyncProperties properties;

  public List<RealtimeDeploymentPO> listByJob(Long jobId) {
    return mapper.selectList(new LambdaQueryWrapper<RealtimeDeploymentPO>()
        .eq(RealtimeDeploymentPO::getJobId, jobId)
        .orderByDesc(RealtimeDeploymentPO::getId));
  }

  public RealtimeDeploymentPO get(Long id) {
    RealtimeDeploymentPO deployment = mapper.selectById(id);
    if (deployment == null) {
      throw new IllegalArgumentException("部署记录不存在：" + id);
    }
    return deployment;
  }

  public RealtimeDeploymentPO submit(Long jobId, JobSubmitRequest request) {
    RealtimeJobPO job = jobService.get(jobId);
    if (JobState.valueOf(job.getState()).isRunning()) {
      throw new IllegalStateException("任务正在提交或运行，不能重复提交");
    }
    ValidationResult validation = jobService.validate(jobId);
    if (!validation.isValid()) {
      throw new IllegalArgumentException(String.join("；", validation.getMessages()));
    }
    RealtimeEnvironmentPO environment = environmentService.requireEnabled(job.getEnvironmentId());
    ValidationResult environmentValidation = environmentService.check(environment.getId());
    if (!environmentValidation.isValid()) {
      throw new IllegalArgumentException(String.join("；", environmentValidation.getMessages()));
    }
    FlinkCdcVersionPO version = versionService.requireEnabled(job.getCdcVersionId());
    RealtimeDeploymentPO deployment = createDeployment(job, environment, version, request);
    jobService.updateState(jobId, JobState.SUBMITTING, deployment.getId());
    FlinkCdcSubmission submission = submission(job, environment, version, deployment, request);
    FlinkCdcDeploymentGateway gateway = gatewayRegistry.require(
        DeploymentMode.valueOf(environment.getDeploymentMode()));
    try {
      DeploymentResult result = gateway.submit(submission);
      markRunning(deployment.getId(), result);
      jobService.updateState(jobId, JobState.RUNNING, deployment.getId());
      return get(deployment.getId());
    } catch (RuntimeException exception) {
      markFailed(deployment.getId(), exception.getMessage());
      jobService.updateState(jobId, JobState.FAILED, deployment.getId());
      throw exception;
    }
  }

  public void cancel(Long jobId) {
    RealtimeJobPO job = jobService.get(jobId);
    if (!JobState.valueOf(job.getState()).isRunning()) {
      throw new IllegalStateException("只有提交中或运行中的任务可以取消");
    }
    RealtimeDeploymentPO deployment = currentDeployment(job);
    RealtimeEnvironmentPO environment = environmentService.get(deployment.getEnvironmentId());
    FlinkCdcVersionPO version = versionService.get(deployment.getCdcVersionId());
    FlinkCdcSubmission submission = submission(job, environment, version, deployment, null);
    updateState(deployment.getId(), DeploymentState.CANCELLING, null);
    try {
      gatewayRegistry.require(DeploymentMode.valueOf(deployment.getDeploymentMode()))
          .cancel(submission);
      markFinished(deployment.getId(), DeploymentState.CANCELLED, null);
      jobService.updateState(jobId, JobState.STOPPED, deployment.getId());
    } catch (RuntimeException exception) {
      markFailed(deployment.getId(), exception.getMessage());
      jobService.updateState(jobId, JobState.FAILED, deployment.getId());
      throw exception;
    }
  }

  public DeploymentStatus status(Long jobId) {
    RealtimeJobPO job = jobService.get(jobId);
    RealtimeDeploymentPO deployment = currentDeployment(job);
    RealtimeEnvironmentPO environment = environmentService.get(deployment.getEnvironmentId());
    FlinkCdcVersionPO version = versionService.get(deployment.getCdcVersionId());
    DeploymentStatus status = gatewayRegistry
        .require(DeploymentMode.valueOf(deployment.getDeploymentMode()))
        .status(submission(job, environment, version, deployment, null));
    if (status.getState() != DeploymentState.UNKNOWN) {
      updateState(deployment.getId(), status.getState(), null);
      if (status.getState() == DeploymentState.FAILED) {
        jobService.updateState(jobId, JobState.FAILED, deployment.getId());
      } else if (status.getState() == DeploymentState.CANCELLED) {
        jobService.updateState(jobId, JobState.STOPPED, deployment.getId());
      } else if (status.getState() == DeploymentState.FINISHED) {
        jobService.updateState(jobId, JobState.FINISHED, deployment.getId());
      }
    }
    return status;
  }

  public SavepointResult triggerSavepoint(Long jobId, String targetDirectory) {
    RealtimeJobPO job = jobService.get(jobId);
    if (JobState.valueOf(job.getState()) != JobState.RUNNING) {
      throw new IllegalStateException("只有运行中的任务可以触发 Savepoint");
    }
    RealtimeDeploymentPO deployment = currentDeployment(job);
    RealtimeEnvironmentPO environment = environmentService.get(deployment.getEnvironmentId());
    FlinkCdcVersionPO version = versionService.get(deployment.getCdcVersionId());
    SavepointResult result = gatewayRegistry
        .require(DeploymentMode.valueOf(deployment.getDeploymentMode()))
        .triggerSavepoint(
            submission(job, environment, version, deployment, null), targetDirectory);
    RealtimeDeploymentPO update = new RealtimeDeploymentPO();
    update.setId(deployment.getId());
    update.setSavepointPath(result.getLocation() == null ? targetDirectory : result.getLocation());
    update.setUpdatedAt(new Date());
    mapper.updateById(update);
    return result;
  }

  private RealtimeDeploymentPO createDeployment(
      RealtimeJobPO job,
      RealtimeEnvironmentPO environment,
      FlinkCdcVersionPO version,
      JobSubmitRequest request) {
    Date now = new Date();
    RealtimeDeploymentPO deployment = new RealtimeDeploymentPO();
    deployment.setJobId(job.getId());
    deployment.setEnvironmentId(environment.getId());
    deployment.setCdcVersionId(version.getId());
    deployment.setDeploymentMode(environment.getDeploymentMode());
    deployment.setState(DeploymentState.SUBMITTING.name());
    deployment.setSavepointPath(request == null ? null : request.getSavepointPath());
    deployment.setCreatedAt(now);
    deployment.setUpdatedAt(now);
    mapper.insert(deployment);
    return deployment;
  }

  private FlinkCdcSubmission submission(
      RealtimeJobPO job,
      RealtimeEnvironmentPO environment,
      FlinkCdcVersionPO version,
      RealtimeDeploymentPO deployment,
      JobSubmitRequest request) {
    Map<String, String> runtimeOptions = new LinkedHashMap<>(jobService.runtimeOptions(job));
    if (request != null && request.getRuntimeOptions() != null) {
      runtimeOptions.putAll(request.getRuntimeOptions());
    }
    return new FlinkCdcSubmission(
        job,
        environment,
        version,
        deployment,
        environmentService.deploymentConfig(environment),
        runtimeOptions,
        request == null ? deployment.getSavepointPath() : request.getSavepointPath(),
        properties.getWorkDirectory());
  }

  private RealtimeDeploymentPO currentDeployment(RealtimeJobPO job) {
    if (job.getCurrentDeploymentId() == null) {
      throw new IllegalStateException("任务还没有部署记录");
    }
    return get(job.getCurrentDeploymentId());
  }

  private void markRunning(Long id, DeploymentResult result) {
    RealtimeDeploymentPO update = new RealtimeDeploymentPO();
    update.setId(id);
    update.setState(DeploymentState.RUNNING.name());
    update.setExternalId(result.getExternalId());
    update.setCommandJson(jsonCodec.writeList(result.getCommand()));
    update.setManifestPath(result.getManifestPath());
    update.setOutput(limit(result.getOutput()));
    update.setSubmittedAt(new Date());
    update.setUpdatedAt(new Date());
    mapper.updateById(update);
  }

  private void markFailed(Long id, String message) {
    markFinished(id, DeploymentState.FAILED, message);
  }

  private void markFinished(Long id, DeploymentState state, String message) {
    RealtimeDeploymentPO update = new RealtimeDeploymentPO();
    update.setId(id);
    update.setState(state.name());
    update.setErrorMessage(limit(message));
    update.setFinishedAt(new Date());
    update.setUpdatedAt(new Date());
    mapper.updateById(update);
  }

  private void updateState(Long id, DeploymentState state, String message) {
    RealtimeDeploymentPO update = new RealtimeDeploymentPO();
    update.setId(id);
    update.setState(state.name());
    update.setErrorMessage(limit(message));
    update.setUpdatedAt(new Date());
    mapper.updateById(update);
  }

  private static String limit(String value) {
    if (value == null || value.length() <= 16000) {
      return value;
    }
    return value.substring(0, 16000);
  }
}
