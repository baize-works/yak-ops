package io.baize.flow.dao.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import io.baize.flow.dao.entity.JobTableMetrics;
import io.baize.flow.web.contract.vo.JobTableMetricsVO;

import java.util.List;

@Mapper
public interface JobTableMetricsMapper extends BaseMapper<JobTableMetrics> {
    List<JobTableMetricsVO> selectByInstanceId(@Param("instanceId") Long instanceId);

    void deleteByDefinitionId(@Param("definitionId") Long definitionId);

}
