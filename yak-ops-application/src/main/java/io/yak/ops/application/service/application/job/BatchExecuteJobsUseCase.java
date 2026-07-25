package io.yak.ops.application.service.application.job;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.CollectionUtils;
import io.yak.ops.application.service.BatchJobDefinitionService;
import io.yak.ops.application.service.BatchJobInstanceService;
import io.yak.ops.common.enums.ReleaseState;
import io.yak.ops.domain.enums.RunMode;
import io.yak.ops.domain.exceptions.ServiceException;
import io.yak.ops.dao.entity.JobInstance;
import io.yak.ops.application.model.vo.BatchJobDefinitionVO;
import io.yak.ops.application.model.vo.BatchJobOperateResultVO;
import io.yak.ops.application.model.vo.JobInstanceVO;
import io.yak.ops.plugin.spi.enums.Status;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Slf4j
public class BatchExecuteJobsUseCase {

    private final BatchJobInstanceService instanceService;
    private final BatchJobDefinitionService definitionService;
    private final ExecuteJobUseCase executeJob;
    private final CancelJobUseCase cancelJob;

    public BatchExecuteJobsUseCase(BatchJobInstanceService instanceService,
                                       BatchJobDefinitionService definitionService,
                                       ExecuteJobUseCase executeJob,
                                       CancelJobUseCase cancelJob) {
        this.instanceService = instanceService;
        this.definitionService = definitionService;
        this.executeJob = executeJob;
        this.cancelJob = cancelJob;
    }

    public Long jobExecute(Long jobDefineId, RunMode runMode) {
        return executeJob.execute(jobDefineId, runMode);
    }

    public Long jobPause(Long jobInstanceId) {
        return cancelJob.cancel(jobInstanceId);
    }

    /**
     * Batch execute jobs by job definition ids.
     *
     * Rules:
     * 1. All selected jobs must exist.
     * 2. All selected jobs must be ONLINE.
     * 3. All selected jobs must not have running instances.
     * 4. If any job does not satisfy the rules, reject the whole batch operation.
     */
    public BatchJobOperateResultVO batchExecute(List<Long> jobDefinitionIds, RunMode runMode) {
        validateJobDefinitionIds(jobDefinitionIds);
        validateRunMode(runMode);

        List<Long> distinctIds = normalizeJobDefinitionIds(jobDefinitionIds);

        BatchJobOperateResultVO result = new BatchJobOperateResultVO();
        result.setTotalCount(distinctIds.size());

        List<BatchJobDefinitionVO> definitions = loadAndValidateDefinitions(distinctIds);

        validateAllJobsOnline(definitions);
        validateNoRunningJobs(distinctIds);

        for (Long jobDefinitionId : distinctIds) {
            try {
                Long jobInstanceId = jobExecute(jobDefinitionId, runMode);
                result.addSuccess(jobDefinitionId, jobInstanceId, "Job started successfully.");

                log.info("Batch execute success: jobDefinitionId={}, jobInstanceId={}",
                        jobDefinitionId, jobInstanceId);
            } catch (Exception e) {
                log.error("Batch execute failed: jobDefinitionId={}", jobDefinitionId, e);
                result.addFailed(jobDefinitionId, null, getErrorMessage(e));
            }
        }

        return result;
    }

    /**
     * Batch pause jobs by job definition ids.
     *
     * Rules:
     * 1. All selected jobs must exist.
     * 2. All selected jobs must have running instances.
     * 3. If any job does not satisfy the rules, reject the whole batch operation.
     */
    public BatchJobOperateResultVO batchPause(List<Long> jobDefinitionIds) {
        validateJobDefinitionIds(jobDefinitionIds);

        List<Long> distinctIds = normalizeJobDefinitionIds(jobDefinitionIds);

        BatchJobOperateResultVO result = new BatchJobOperateResultVO();
        result.setTotalCount(distinctIds.size());

        loadAndValidateDefinitions(distinctIds);

        List<JobInstance> runningInstances =
                instanceService.listRunningInstanceByDefinitionIds(distinctIds);

        Map<Long, List<JobInstance>> instanceMap = Optional.ofNullable(runningInstances)
                .orElse(java.util.Collections.emptyList())
                .stream()
                .collect(Collectors.groupingBy(JobInstance::getJobDefinitionId));

        validateAllJobsRunning(distinctIds, instanceMap);

        for (Long jobDefinitionId : distinctIds) {
            List<JobInstance> instances = instanceMap.get(jobDefinitionId);

            for (JobInstance instance : instances) {
                try {
                    Long jobInstanceId = instance.getId();
                    jobPause(jobInstanceId);

                    result.addSuccess(jobDefinitionId, jobInstanceId, "Job paused successfully.");

                    log.info("Batch pause success: jobDefinitionId={}, jobInstanceId={}",
                            jobDefinitionId, jobInstanceId);
                } catch (Exception e) {
                    log.error("Batch pause failed: jobDefinitionId={}, instanceId={}",
                            jobDefinitionId, instance.getId(), e);
                    result.addFailed(jobDefinitionId, instance.getId(), getErrorMessage(e));
                }
            }
        }

        return result;
    }

    private List<Long> normalizeJobDefinitionIds(List<Long> jobDefinitionIds) {
        List<Long> ids = jobDefinitionIds.stream()
                .filter(id -> id != null && id > 0)
                .distinct()
                .collect(java.util.stream.Collectors.toList());

        if (CollectionUtils.isEmpty(ids)) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "jobDefinitionIds");
        }

        return ids;
    }

    /**
     * Load definitions and validate all selected ids exist.
     */
    private List<BatchJobDefinitionVO> loadAndValidateDefinitions(List<Long> jobDefinitionIds) {
        List<BatchJobDefinitionVO> definitions = definitionService.listByIds(jobDefinitionIds);

        if (CollectionUtils.isEmpty(definitions)) {
            throw new ServiceException(
                    Status.JOB_DEFINITION_EXECUTE_ERROR,
                    "Job definitions not found: " + jobDefinitionIds
            );
        }

        Set<Long> existsIds = definitions.stream()
                .map(BatchJobDefinitionVO::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        List<Long> notExistsIds = jobDefinitionIds.stream()
                .filter(id -> !existsIds.contains(id))
                .collect(java.util.stream.Collectors.toList());

        if (CollectionUtils.isNotEmpty(notExistsIds)) {
            throw new ServiceException(
                    Status.JOB_DEFINITION_EXECUTE_ERROR,
                    "Job definitions not found: " + notExistsIds
            );
        }

        return definitions;
    }

    /**
     * Validate all selected jobs are ONLINE.
     */
    private void validateAllJobsOnline(List<BatchJobDefinitionVO> definitions) {
        List<Long> offlineIds = definitions.stream()
                .filter(item -> !isOnline(item.getReleaseState()))
                .map(BatchJobDefinitionVO::getId)
                .collect(java.util.stream.Collectors.toList());

        if (CollectionUtils.isNotEmpty(offlineIds)) {
            throw new ServiceException(
                    Status.JOB_DEFINITION_EXECUTE_ERROR,
                    "存在未上线任务，请先上线后再启动。任务ID：" + offlineIds
            );
        }
    }

    /**
     * Validate selected jobs do not contain running jobs.
     */
    private void validateNoRunningJobs(List<Long> jobDefinitionIds) {
        List<Long> runningIds = jobDefinitionIds.stream()
                .filter(instanceService::existsRunningInstance)
                .collect(java.util.stream.Collectors.toList());

        if (CollectionUtils.isNotEmpty(runningIds)) {
            throw new ServiceException(
                    Status.JOB_DEFINITION_EXECUTE_ERROR,
                    "存在运行中的任务，请只选择未运行任务进行批量启动。任务ID：" + runningIds
            );
        }
    }

    /**
     * Validate all selected jobs have running instances.
     */
    private void validateAllJobsRunning(List<Long> jobDefinitionIds,
                                        Map<Long, List<JobInstance>> instanceMap) {
        List<Long> notRunningIds = jobDefinitionIds.stream()
                .filter(id -> !instanceMap.containsKey(id)
                        || CollectionUtils.isEmpty(instanceMap.get(id)))
                .collect(java.util.stream.Collectors.toList());

        if (CollectionUtils.isNotEmpty(notRunningIds)) {
            throw new ServiceException(
                    Status.JOB_DEFINITION_EXECUTE_ERROR,
                    "存在未运行的任务，请只选择运行中的任务进行批量停止。任务ID：" + notRunningIds
            );
        }
    }

    /**
     * Compatible with ReleaseState enum or string-like value.
     */
    private boolean isOnline(Object releaseState) {
        if (releaseState == null) {
            return false;
        }

        if (releaseState instanceof ReleaseState) {
            return ReleaseState.ONLINE.equals(releaseState);
        }

        return ReleaseState.ONLINE.name().equalsIgnoreCase(String.valueOf(releaseState));
    }

    private void validateJobDefinitionId(Long jobDefinitionId) {
        if (jobDefinitionId == null || jobDefinitionId <= 0) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "jobDefinitionId");
        }
    }

    private void validateJobDefinitionIds(List<Long> jobDefinitionIds) {
        if (CollectionUtils.isEmpty(jobDefinitionIds)) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "jobDefinitionIds");
        }
    }

    private void validateRunMode(RunMode runMode) {
        if (runMode == null) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "runMode");
        }
    }

    private void validateInstanceId(Long jobInstanceId) {
        if (jobInstanceId == null || jobInstanceId <= 0) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "jobInstanceId");
        }
    }

    private boolean isFinishedStatus(String status) {
        if (status == null) {
            return false;
        }

        return "FINISHED".equalsIgnoreCase(status)
                || "FAILED".equalsIgnoreCase(status)
                || "CANCELED".equalsIgnoreCase(status)
                || "CANCELLED".equalsIgnoreCase(status)
                || "STOPPED".equalsIgnoreCase(status);
    }

    private String getErrorMessage(Exception e) {
        if (e == null) {
            return "Unknown error";
        }

        if (e.getMessage() == null) {
            return e.getClass().getSimpleName();
        }

        return e.getMessage();
    }
}
