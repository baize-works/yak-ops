package io.yak.ops.dao.repository.impl;

import javax.annotation.Resource;
import lombok.NonNull;
import io.yak.ops.dao.entity.JobTableMetrics;
import io.yak.ops.dao.mapper.JobTableMetricsMapper;
import io.yak.ops.dao.repository.BaseDao;
import io.yak.ops.dao.repository.JobTableMetricsDao;
import io.yak.ops.dao.model.result.JobTableMetricsResult;
import org.springframework.stereotype.Repository;

import java.util.Collections;
import java.util.List;

@Repository
public class JobTableMetricsDaoImpl extends BaseDao<JobTableMetrics, JobTableMetricsMapper>
        implements JobTableMetricsDao {

    @Resource
    private JobTableMetricsMapper jobTableMetricsMapper;

    public JobTableMetricsDaoImpl(@NonNull JobTableMetricsMapper jobTableMetricsMapper) {
        super(jobTableMetricsMapper);
    }

    @Override
    public List<JobTableMetricsResult> selectByInstanceId(Long instanceId) {
        if (instanceId == null || instanceId <= 0) {
            return java.util.Collections.emptyList();
        }

        return jobTableMetricsMapper.selectByInstanceId(instanceId);
    }

    @Override
    public void deleteByDefinitionId(Long definitionId) {
        if (definitionId == null || definitionId <= 0) {
            return;
        }

        jobTableMetricsMapper.deleteByDefinitionId(definitionId);
    }
}
