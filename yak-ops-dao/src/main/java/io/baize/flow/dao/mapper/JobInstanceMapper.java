package io.baize.flow.dao.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import io.baize.flow.dao.entity.JobInstance;
import io.baize.flow.web.contract.dto.SeaTunnelJobInstanceDTO;
import io.baize.flow.web.contract.vo.JobInstanceVO;

@Mapper
public interface JobInstanceMapper extends BaseMapper<JobInstance> {
    IPage<JobInstanceVO> pageWithDefinition(
            Page<?> page,
            @Param("dto") SeaTunnelJobInstanceDTO dto);

    JobInstanceVO selectDetailById(@Param("id") Long id);

}
