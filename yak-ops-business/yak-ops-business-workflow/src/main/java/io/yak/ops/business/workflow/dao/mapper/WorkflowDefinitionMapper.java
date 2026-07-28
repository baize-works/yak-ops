package io.yak.ops.business.workflow.dao.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import io.yak.ops.business.workflow.common.po.WorkflowDefinitionPO;
import org.apache.ibatis.annotations.Mapper;

/** 工作流定义 MyBatis 映射接口。 */
@Mapper
public interface WorkflowDefinitionMapper extends BaseMapper<WorkflowDefinitionPO> {
}
