package io.yak.ops.dao.repository.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import javax.annotation.Resource;
import lombok.NonNull;
import io.yak.ops.dao.entity.JobMetrics;
import io.yak.ops.dao.mapper.JobMetricsMapper;
import io.yak.ops.dao.repository.BaseDao;
import io.yak.ops.dao.repository.JobMetricsDao;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class JobMetricsDaoImpl
        extends BaseDao<JobMetrics, JobMetricsMapper>
        implements JobMetricsDao {

    @Resource
    private JobMetricsMapper jobMetricsMapper;

    public JobMetricsDaoImpl(@NonNull JobMetricsMapper jobMetricsMapper) {
        super(jobMetricsMapper);
    }

    @Override
    public Map<String, Object> selectOverviewSummary(String startTime, String endTime, String taskType) {
        return jobMetricsMapper.selectOverviewSummary(startTime, endTime, taskType);
    }

    @Override
    public List<Map<String, Object>> selectRecordsTrend(String startTime, String endTime, String taskType, String granularity) {
        return jobMetricsMapper.selectRecordsTrend(startTime, endTime, taskType, granularity);
    }

    @Override
    public List<Map<String, Object>> selectBytesTrend(String startTime, String endTime, String taskType, String granularity) {
        return jobMetricsMapper.selectBytesTrend(startTime, endTime, taskType, granularity);
    }

    @Override
    public List<Map<String, Object>> selectRecordsSpeedTrend(String startTime, String endTime, String taskType, String granularity) {
        return jobMetricsMapper.selectRecordsSpeedTrend(startTime, endTime, taskType, granularity);
    }

    @Override
    public List<Map<String, Object>> selectBytesSpeedTrend(String startTime, String endTime, String taskType, String granularity) {
        return jobMetricsMapper.selectBytesSpeedTrend(startTime, endTime, taskType, granularity);
    }

    @Override
    public void deleteByDefinitionId(Long definitionId) {
        jobMetricsMapper.delete(
                new LambdaQueryWrapper<JobMetrics>()
                        .eq(JobMetrics::getJobDefinitionId, definitionId)
        );
    }
}
