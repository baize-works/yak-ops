package io.yak.ops.business.workflow.service.impl;

import io.yak.ops.common.constant.workflow.WorkflowConstant;
import io.yak.ops.common.bean.dto.workflow.WorkflowDTO;
import io.yak.ops.common.bean.dto.workflow.WorkflowUpdateDTO;
import io.yak.ops.common.bean.entity.workflow.WorkflowDefinition;
import io.yak.ops.common.bean.entity.workflow.WorkflowVersion;
import io.yak.ops.common.enums.workflow.DefinitionState;
import io.yak.ops.common.enums.workflow.FailureStrategy;
import io.yak.ops.common.bean.po.workflow.WorkflowDefinitionPO;
import io.yak.ops.common.bean.po.workflow.WorkflowVersionPO;
import io.yak.ops.common.bean.vo.workflow.WorkflowDefinitionVO;
import io.yak.ops.common.bean.vo.workflow.WorkflowVersionVO;
import io.yak.ops.business.workflow.config.ConditionalOnWorkflowEnabled;
import io.yak.ops.business.workflow.dag.WorkflowDagCompiler;
import io.yak.ops.business.workflow.dao.WorkflowDefinitionDao;
import io.yak.ops.business.workflow.service.WorkflowDefinitionService;
import io.yak.ops.business.workflow.util.WorkflowConvertUtils;
import io.yak.ops.business.workflow.util.WorkflowJsonCodec;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 工作流定义服务实现。 */
@ConditionalOnWorkflowEnabled
@Service
@RequiredArgsConstructor
public class WorkflowDefinitionServiceImpl implements WorkflowDefinitionService {

  private final WorkflowDefinitionDao definitionDao;
  private final WorkflowDagCompiler dagCompiler;
  private final WorkflowJsonCodec jsonCodec;

  @Override
  @Transactional(transactionManager = "workflowTransactionManager")
  public Long addWorkflow(WorkflowDTO workflowDTO, String operator) {
    validate(workflowDTO);
    Date now = new Date();
    WorkflowDefinitionPO definitionPO = new WorkflowDefinitionPO();
    definitionPO.setCode(workflowDTO.getCode().trim());
    definitionPO.setName(workflowDTO.getName().trim());
    definitionPO.setDescription(workflowDTO.getDescription());
    definitionPO.setState(DefinitionState.DRAFT.name());
    definitionPO.setFailureStrategy(strategy(workflowDTO.getFailureStrategy()).name());
    definitionPO.setMaxParallelism(workflowDTO.getMaxParallelism());
    definitionPO.setDraftJson(jsonCodec.write(workflowDTO.getDag()));
    definitionPO.setCreatedBy(operator);
    definitionPO.setCreatedAt(now);
    definitionPO.setUpdatedAt(now);
    definitionDao.addDefinition(definitionPO);
    return definitionPO.getId();
  }

  @Override
  @Transactional(transactionManager = "workflowTransactionManager")
  public void editWorkflow(Long workflowId, WorkflowUpdateDTO workflowDTO) {
    validate(workflowDTO);
    requireWorkflow(workflowId);
    WorkflowDefinitionPO definitionPO = new WorkflowDefinitionPO();
    definitionPO.setId(workflowId);
    definitionPO.setName(workflowDTO.getName().trim());
    definitionPO.setDescription(workflowDTO.getDescription());
    definitionPO.setFailureStrategy(strategy(workflowDTO.getFailureStrategy()).name());
    definitionPO.setMaxParallelism(workflowDTO.getMaxParallelism());
    definitionPO.setDraftJson(jsonCodec.write(workflowDTO.getDag()));
    definitionPO.setUpdatedAt(new Date());
    if (definitionDao.editDefinition(definitionPO) != 1) {
      throw new IllegalArgumentException("工作流定义不存在：" + workflowId);
    }
  }

  @Override
  @Transactional(transactionManager = "workflowTransactionManager")
  public WorkflowVersionVO publishWorkflow(Long workflowId, String operator) {
    WorkflowDefinition definition = requireWorkflow(workflowId);
    dagCompiler.compile(definition.getDraft());
    int version = definition.getCurrentVersion() == null
        ? 1
        : definition.getCurrentVersion() + 1;
    Date now = new Date();

    WorkflowVersionPO versionPO = new WorkflowVersionPO();
    versionPO.setWorkflowId(workflowId);
    versionPO.setVersion(version);
    versionPO.setDagJson(jsonCodec.write(definition.getDraft()));
    versionPO.setContentHash(jsonCodec.sha256(definition.getDraft()));
    versionPO.setPublishedBy(operator);
    versionPO.setPublishedAt(now);
    definitionDao.addVersion(versionPO);

    WorkflowDefinitionPO definitionPO = new WorkflowDefinitionPO();
    definitionPO.setId(workflowId);
    definitionPO.setState(DefinitionState.PUBLISHED.name());
    definitionPO.setCurrentVersion(version);
    definitionPO.setUpdatedAt(now);
    definitionDao.editDefinition(definitionPO);

    WorkflowVersion published = definitionDao.selectVersion(workflowId, version);
    return WorkflowConvertUtils.toVO(published);
  }

  @Override
  public WorkflowDefinitionVO getWorkflow(Long workflowId) {
    return WorkflowConvertUtils.toVO(requireWorkflow(workflowId));
  }

  @Override
  public List<WorkflowDefinitionVO> getWorkflowList() {
    return definitionDao.selectAllDefinition().stream()
        .map(WorkflowConvertUtils::toVO)
        .collect(Collectors.toList());
  }

  private WorkflowDefinition requireWorkflow(Long workflowId) {
    WorkflowDefinition definition = definitionDao.selectDefinitionById(workflowId);
    if (definition == null) {
      throw new IllegalArgumentException("工作流定义不存在：" + workflowId);
    }
    return definition;
  }

  private static void validate(WorkflowDTO workflowDTO) {
    if (workflowDTO == null) {
      throw new IllegalArgumentException("工作流定义不能为空");
    }
    requireText(workflowDTO.getCode(), "工作流编码");
    requireText(workflowDTO.getName(), "工作流名称");
    validateParallelism(workflowDTO.getMaxParallelism());
  }

  private static void validate(WorkflowUpdateDTO workflowDTO) {
    if (workflowDTO == null) {
      throw new IllegalArgumentException("工作流草稿不能为空");
    }
    requireText(workflowDTO.getName(), "工作流名称");
    validateParallelism(workflowDTO.getMaxParallelism());
  }

  private static void validateParallelism(int maxParallelism) {
    if (maxParallelism < 1 || maxParallelism > WorkflowConstant.MAX_PARALLELISM) {
      throw new IllegalArgumentException(
          "工作流并行度必须在 1 到 " + WorkflowConstant.MAX_PARALLELISM + " 之间");
    }
  }

  private static void requireText(String value, String fieldName) {
    if (value == null || value.isBlank()) {
      throw new IllegalArgumentException(fieldName + "不能为空");
    }
  }

  private static FailureStrategy strategy(FailureStrategy value) {
    return value == null ? FailureStrategy.FAIL_FAST : value;
  }
}
