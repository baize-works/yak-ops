package io.yak.ops.dao.repository;


import io.yak.ops.dao.entity.JobTableMetrics;
import io.yak.ops.dao.model.result.JobTableMetricsResult;

import java.util.List;

/**
 * DAO for SeaTunnel table level metrics.
 */
public interface JobTableMetricsDao extends IDao<JobTableMetrics> {
    List<JobTableMetricsResult> selectByInstanceId(Long instanceId);

    void deleteByDefinitionId(Long definitionId);
}
