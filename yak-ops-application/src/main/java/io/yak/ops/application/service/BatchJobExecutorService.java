package io.yak.ops.application.service;

import io.yak.ops.domain.enums.RunMode;
import io.yak.ops.web.contract.vo.BatchJobOperateResultVO;

import java.util.List;

/**
 * Service interface for executing and managing SeaTunnel jobs.
 * <p>
 * Provides capabilities to execute, pause, store, and run ad-hoc jobs.
 */
public interface BatchJobExecutorService {

    /**
     * Execute a SeaTunnel job based on the job definition ID.
     *
     * @param jobDefineId the ID of the job definition
     * @return the job instance ID created after execution
     */
    Long jobExecute(Long jobDefineId, RunMode runMode);

    /**
     * Pause a running SeaTunnel job instance.
     *
     * @param jobInstanceId the ID of the job instance
     * @return the job instance ID after pause operation
     */
    Long jobPause(Long jobInstanceId);

    BatchJobOperateResultVO batchExecute(List<Long> jobDefinitionIds, RunMode runMode);

    BatchJobOperateResultVO batchPause(List<Long> jobDefinitionIds);

}
