package io.yak.ops.business.workflow.dao.impl;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import io.yak.ops.business.workflow.config.ConditionalOnWorkflowEnabled;
import io.yak.ops.common.bean.entity.workflow.WorkflowDefinition;
import io.yak.ops.common.bean.entity.workflow.WorkflowVersion;
import io.yak.ops.common.bean.po.workflow.WorkflowDefinitionPO;
import io.yak.ops.common.bean.po.workflow.WorkflowVersionPO;
import io.yak.ops.business.workflow.dao.WorkflowDefinitionDao;
import io.yak.ops.business.workflow.dao.mapper.WorkflowDefinitionMapper;
import io.yak.ops.business.workflow.dao.mapper.WorkflowVersionMapper;
import io.yak.ops.business.workflow.util.WorkflowConvertUtils;
import io.yak.ops.business.workflow.util.WorkflowJsonCodec;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/** 工作流定义数据访问实现。 */
@ConditionalOnWorkflowEnabled
@Repository
@RequiredArgsConstructor
public class WorkflowDefinitionDaoImpl implements WorkflowDefinitionDao {

  private final WorkflowDefinitionMapper definitionMapper;
  private final WorkflowVersionMapper versionMapper;
  private final WorkflowJsonCodec jsonCodec;

  @Override
  public int addDefinition(WorkflowDefinitionPO definitionPO) {
    return definitionMapper.insert(definitionPO);
  }

  @Override
  public int editDefinition(WorkflowDefinitionPO definitionPO) {
    return definitionMapper.updateById(definitionPO);
  }

  @Override
  public WorkflowDefinition selectDefinitionById(Long workflowId) {
    return WorkflowConvertUtils.toDefinition(definitionMapper.selectById(workflowId), jsonCodec);
  }

  @Override
  public List<WorkflowDefinition> selectAllDefinition() {
    return definitionMapper.selectList(
            Wrappers.<WorkflowDefinitionPO>lambdaQuery()
                .orderByDesc(WorkflowDefinitionPO::getUpdatedAt)
                .orderByDesc(WorkflowDefinitionPO::getId))
        .stream()
        .map(item -> WorkflowConvertUtils.toDefinition(item, jsonCodec))
        .collect(Collectors.toList());
  }

  @Override
  public int addVersion(WorkflowVersionPO versionPO) {
    return versionMapper.insert(versionPO);
  }

  @Override
  public WorkflowVersion selectVersion(Long workflowId, Integer version) {
    WorkflowVersionPO versionPO = versionMapper.selectOne(
        Wrappers.<WorkflowVersionPO>lambdaQuery()
            .eq(WorkflowVersionPO::getWorkflowId, workflowId)
            .eq(WorkflowVersionPO::getVersion, version));
    return WorkflowConvertUtils.toVersion(versionPO, jsonCodec);
  }
}
