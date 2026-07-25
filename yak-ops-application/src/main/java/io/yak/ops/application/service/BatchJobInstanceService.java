package io.yak.ops.application.service;

import io.yak.ops.domain.enums.RunMode;
import io.yak.ops.dao.entity.JobInstance;
import io.yak.ops.application.model.dto.SeaTunnelJobInstanceDTO;
import io.yak.ops.application.model.dto.command.JobDefinitionSaveCommand;
import io.yak.ops.application.model.response.PaginationResult;
import io.yak.ops.application.model.vo.JobInstanceVO;
import io.yak.ops.application.model.vo.JobTableMetricsVO;

import java.util.List;

public interface BatchJobInstanceService {

    JobInstanceVO create(Long jobDefineId, RunMode runMode);

    PaginationResult<JobInstanceVO> paging(SeaTunnelJobInstanceDTO dto);

    String buildJobConfig(JobDefinitionSaveCommand command);

    JobInstanceVO selectById(Long id);

    String getLogContent(Long instanceId);

    boolean existsRunningInstance(Long definitionId);

    void removeAllByDefinitionId(Long definitionId);

    void updateById(JobInstance po);

    /**
     * Query table level metrics for one job instance.
     */
    List<JobTableMetricsVO> listTableMetrics(Long instanceId);

    List<JobInstance> listRunningInstanceByDefinitionIds(List<Long> definitionIds);
}
