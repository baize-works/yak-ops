package io.yak.ops.dao.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import io.yak.ops.dao.entity.JobInstance;
import io.yak.ops.dao.model.query.JobInstanceQuery;
import io.yak.ops.dao.model.result.JobInstanceResult;

@Mapper
public interface JobInstanceMapper extends BaseMapper<JobInstance> {
    IPage<JobInstanceResult> pageWithDefinition(
            Page<?> page,
            @Param("query") JobInstanceQuery query);

    JobInstanceResult selectDetailById(@Param("id") Long id);

}
