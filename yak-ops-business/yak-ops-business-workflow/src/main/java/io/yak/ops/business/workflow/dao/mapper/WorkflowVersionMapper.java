package io.yak.ops.business.workflow.dao.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import io.yak.ops.common.bean.po.workflow.WorkflowVersionPO;
import org.apache.ibatis.annotations.Mapper;

/** 工作流发布版本 MyBatis 映射接口。 */
@Mapper
public interface WorkflowVersionMapper extends BaseMapper<WorkflowVersionPO> {
}
