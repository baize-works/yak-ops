package io.yak.ops.dao.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import io.yak.ops.dao.entity.JobExecutionEntity;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface JobExecutionMapper extends BaseMapper<JobExecutionEntity> { }
