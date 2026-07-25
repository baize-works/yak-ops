package io.yak.ops.dao.repository;


import io.yak.ops.dao.entity.JobTableMetrics;
import io.yak.ops.web.contract.vo.JobTableMetricsVO;

import java.util.List;

/**
 * DAO for SeaTunnel table level metrics.
 */
public interface JobTableMetricsDao extends IDao<JobTableMetrics> {
    List<JobTableMetricsVO> selectByInstanceId(Long instanceId);

    void deleteByDefinitionId(Long definitionId);
}
