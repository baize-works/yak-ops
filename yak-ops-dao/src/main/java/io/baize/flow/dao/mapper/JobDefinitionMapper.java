package io.baize.flow.dao.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import io.baize.flow.dao.entity.JobDefinitionEntity;
import io.baize.flow.web.contract.dto.BatchJobDefinitionQueryDTO;
import io.baize.flow.web.contract.vo.BatchJobDefinitionVO;

import java.util.List;

@Mapper
public interface JobDefinitionMapper extends BaseMapper<JobDefinitionEntity> {
    List<BatchJobDefinitionVO> selectPageWithLatestInstance(
            @Param("dto") BatchJobDefinitionQueryDTO dto,
            @Param("offset") int offset,
            @Param("pageSize") int pageSize
    );

    Long selectDefinitionCount(@Param("dto") BatchJobDefinitionQueryDTO dto);
}
