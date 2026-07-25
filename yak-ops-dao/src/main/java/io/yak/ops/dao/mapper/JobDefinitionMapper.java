package io.yak.ops.dao.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import io.yak.ops.dao.entity.JobDefinitionEntity;
import io.yak.ops.dao.model.query.JobDefinitionQuery;
import io.yak.ops.dao.model.result.JobDefinitionResult;

import java.util.List;

@Mapper
public interface JobDefinitionMapper extends BaseMapper<JobDefinitionEntity> {
    List<JobDefinitionResult> selectPageWithLatestInstance(
            @Param("query") JobDefinitionQuery query,
            @Param("offset") int offset,
            @Param("pageSize") int pageSize
    );

    Long selectDefinitionCount(@Param("query") JobDefinitionQuery query);
}
