package io.yak.ops.dao.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import io.yak.ops.dao.entity.JobTableMetrics;
import io.yak.ops.dao.model.result.JobTableMetricsResult;

import java.util.List;

@Mapper
public interface JobTableMetricsMapper extends BaseMapper<JobTableMetrics> {
    List<JobTableMetricsResult> selectByInstanceId(@Param("instanceId") Long instanceId);

    void deleteByDefinitionId(@Param("definitionId") Long definitionId);

}
