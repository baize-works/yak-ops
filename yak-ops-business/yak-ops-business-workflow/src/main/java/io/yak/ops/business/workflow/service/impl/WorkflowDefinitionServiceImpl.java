package io.yak.ops.business.workflow.service.impl;

import io.yak.ops.business.workflow.config.ConditionalOnWorkflowEnabled;
import io.yak.ops.business.workflow.dag.WorkflowDagCompiler;
import io.yak.ops.business.workflow.dag.WorkflowV2DagValidator;
import io.yak.ops.business.workflow.dag.WorkflowV2PublicationValidator;
import io.yak.ops.business.workflow.dao.WorkflowDefinitionDao;
import io.yak.ops.business.workflow.dao.WorkflowExecutionDao;
import io.yak.ops.business.workflow.service.WorkflowDefinitionService;
import io.yak.ops.business.workflow.service.WorkflowScheduleService;
import io.yak.ops.business.workflow.util.WorkflowJsonCodec;
import io.yak.ops.business.workflow.util.WorkflowV2ConvertUtils;
import io.yak.ops.common.bean.dto.workflow.WorkflowDTO;
import io.yak.ops.common.bean.dto.workflow.WorkflowUpdateDTO;
import io.yak.ops.common.bean.dto.workflow.WorkflowV2DTO;
import io.yak.ops.common.bean.dto.workflow.WorkflowV2UpdateDTO;
import io.yak.ops.common.bean.entity.workflow.WorkflowDag;
import io.yak.ops.common.bean.entity.workflow.WorkflowDefinition;
import io.yak.ops.common.bean.entity.workflow.WorkflowVersion;
import io.yak.ops.common.bean.entity.workflow.v2.WorkflowV2Dag;
import io.yak.ops.common.bean.po.workflow.WorkflowDefinitionPO;
import io.yak.ops.common.bean.po.workflow.WorkflowVersionPO;
import io.yak.ops.common.bean.vo.workflow.WorkflowDefinitionVO;
import io.yak.ops.common.bean.vo.workflow.WorkflowVersionVO;
import io.yak.ops.common.constant.workflow.WorkflowConstant;
import io.yak.ops.common.enums.workflow.DefinitionState;
import io.yak.ops.common.enums.workflow.FailureStrategy;
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
  private final WorkflowExecutionDao executionDao;
  private final WorkflowScheduleService scheduleService;
  private final WorkflowDagCompiler dagCompiler;
  private final WorkflowV2DagValidator v2DagValidator;
  private final WorkflowV2PublicationValidator v2PublicationValidator;
  private final WorkflowJsonCodec jsonCodec;

  @Override
  @Transactional(transactionManager = "workflowTransactionManager")
  public Long addWorkflow(WorkflowDTO workflowDTO, String operator) {
    validate(workflowDTO);
    WorkflowDag normalizedDag = dagCompiler.normalizeAndValidate(workflowDTO.getDag());
    return addDefinition(
        workflowDTO.getCode(),
        workflowDTO.getName(),
        workflowDTO.getDescription(),
        workflowDTO.getFailureStrategy(),
        workflowDTO.getMaxParallelism(),
        1,
        normalizedDag,
        operator);
  }

  @Override
  @Transactional(transactionManager = "workflowTransactionManager")
  public Long addWorkflowV2(WorkflowV2DTO workflowDTO, String operator) {
    validate(workflowDTO);
    WorkflowV2Dag normalizedDag = v2DagValidator.normalizeAndValidate(workflowDTO.getDag());
    return addDefinition(
        workflowDTO.getCode(),
        workflowDTO.getName(),
        workflowDTO.getDescription(),
        workflowDTO.getFailureStrategy(),
        workflowDTO.getMaxParallelism(),
        WorkflowV2Dag.SCHEMA_VERSION,
        normalizedDag,
        operator);
  }

  private Long addDefinition(
      String codeValue,
      String nameValue,
      String description,
      FailureStrategy failureStrategy,
      int maxParallelism,
      int schemaVersion,
      Object dag,
      String operator) {
    String code = codeValue.trim();
    if (definitionDao.existsDefinitionByCode(code)) {
      throw new IllegalArgumentException("工作流编码已存在：" + code);
    }
    Date now = new Date();
    WorkflowDefinitionPO definitionPO = new WorkflowDefinitionPO();
    definitionPO.setCode(code);
    definitionPO.setName(nameValue.trim());
    definitionPO.setDescription(description);
    definitionPO.setState(DefinitionState.DRAFT.name());
    definitionPO.setFailureStrategy(strategy(failureStrategy).name());
    definitionPO.setMaxParallelism(maxParallelism);
    definitionPO.setDraftSchemaVersion(schemaVersion);
    definitionPO.setDraftJson(jsonCodec.write(dag));
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
    WorkflowDefinition definition = requireWorkflow(workflowId);
    requireSchema(definition, 1, "V1");
    WorkflowDag normalizedDag = dagCompiler.normalizeAndValidate(workflowDTO.getDag());
    editDefinition(
        workflowId,
        workflowDTO.getName(),
        workflowDTO.getDescription(),
        workflowDTO.getFailureStrategy(),
        workflowDTO.getMaxParallelism(),
        1,
        normalizedDag);
  }

  @Override
  @Transactional(transactionManager = "workflowTransactionManager")
  public void editWorkflowV2(Long workflowId, WorkflowV2UpdateDTO workflowDTO) {
    validate(workflowDTO);
    WorkflowDefinition definition = requireWorkflow(workflowId);
    requireSchema(definition, WorkflowV2Dag.SCHEMA_VERSION, "V2");
    WorkflowV2Dag normalizedDag = v2DagValidator.normalizeAndValidate(workflowDTO.getDag());
    editDefinition(
        workflowId,
        workflowDTO.getName(),
        workflowDTO.getDescription(),
        workflowDTO.getFailureStrategy(),
        workflowDTO.getMaxParallelism(),
        WorkflowV2Dag.SCHEMA_VERSION,
        normalizedDag);
  }

  private void editDefinition(
      Long workflowId,
      String name,
      String description,
      FailureStrategy failureStrategy,
      int maxParallelism,
      int schemaVersion,
      Object dag) {
    WorkflowDefinitionPO definitionPO = new WorkflowDefinitionPO();
    definitionPO.setId(workflowId);
    definitionPO.setName(name.trim());
    definitionPO.setDescription(description);
    definitionPO.setFailureStrategy(strategy(failureStrategy).name());
    definitionPO.setMaxParallelism(maxParallelism);
    definitionPO.setDraftSchemaVersion(schemaVersion);
    definitionPO.setDraftJson(jsonCodec.write(dag));
    definitionPO.setUpdatedAt(new Date());
    if (definitionDao.editDefinition(definitionPO) != 1) {
      throw new IllegalArgumentException("工作流定义不存在：" + workflowId);
    }
  }

  @Override
  @Transactional(transactionManager = "workflowTransactionManager")
  public void deleteWorkflow(Long workflowId) {
    requireWorkflow(workflowId);
    if (!executionDao.selectInstanceListByWorkflowId(workflowId, 1).isEmpty()) {
      throw new IllegalStateException("工作流已经产生运行实例，暂不允许删除：" + workflowId);
    }
    scheduleService.delete(workflowId);
    if (definitionDao.deleteDefinition(workflowId) != 1) {
      throw new IllegalArgumentException("工作流定义不存在：" + workflowId);
    }
  }

  @Override
  @Transactional(transactionManager = "workflowTransactionManager")
  public WorkflowVersionVO publishWorkflow(Long workflowId, String operator) {
    WorkflowDefinition definition = requireWorkflow(workflowId);
    Object normalizedDag;
    if (definition.getSchemaVersion() == 1) {
      dagCompiler.compile(definition.getDraft());
      normalizedDag = definition.getDraft();
    } else if (definition.getSchemaVersion() == WorkflowV2Dag.SCHEMA_VERSION) {
      WorkflowV2Dag dag = v2DagValidator.normalizeAndValidate(definition.getDraftV2());
      v2PublicationValidator.validate(dag);
      normalizedDag = dag;
    } else {
      throw new IllegalStateException(
          "不支持的工作流 schemaVersion：" + definition.getSchemaVersion());
    }

    int version = definition.getCurrentVersion() == null
        ? 1
        : definition.getCurrentVersion() + 1;
    Date now = new Date();
    WorkflowVersionPO versionPO = new WorkflowVersionPO();
    versionPO.setWorkflowId(workflowId);
    versionPO.setVersion(version);
    versionPO.setSchemaVersion(definition.getSchemaVersion());
    versionPO.setDagJson(jsonCodec.write(normalizedDag));
    versionPO.setContentHash(jsonCodec.sha256(normalizedDag));
    versionPO.setPublishedBy(operator);
    versionPO.setPublishedAt(now);
    definitionDao.addVersion(versionPO);

    WorkflowDefinitionPO definitionPO = new WorkflowDefinitionPO();
    definitionPO.setId(workflowId);
    definitionPO.setState(DefinitionState.PUBLISHED.name());
    definitionPO.setCurrentVersion(version);
    definitionPO.setUpdatedAt(now);
    definitionDao.editDefinition(definitionPO);

    return WorkflowV2ConvertUtils.toVO(requireVersion(workflowId, version));
  }

  @Override
  public WorkflowDefinitionVO getWorkflow(Long workflowId) {
    return WorkflowV2ConvertUtils.toVO(requireWorkflow(workflowId));
  }

  @Override
  public WorkflowVersionVO getWorkflowVersion(Long workflowId, Integer version) {
    return WorkflowV2ConvertUtils.toVO(requireVersion(workflowId, version));
  }

  @Override
  public List<WorkflowDefinitionVO> getWorkflowList() {
    return definitionDao.selectAllDefinition().stream()
        .map(WorkflowV2ConvertUtils::toVO)
        .collect(Collectors.toList());
  }

  private WorkflowDefinition requireWorkflow(Long workflowId) {
    WorkflowDefinition definition = definitionDao.selectDefinitionById(workflowId);
    if (definition == null) {
      throw new IllegalArgumentException("工作流定义不存在：" + workflowId);
    }
    return definition;
  }

  private WorkflowVersion requireVersion(Long workflowId, Integer version) {
    if (version == null || version <= 0) {
      throw new IllegalArgumentException("工作流版本号必须为正整数");
    }
    WorkflowVersion result = definitionDao.selectVersion(workflowId, version);
    if (result == null) {
      throw new IllegalArgumentException("工作流版本不存在：" + workflowId + "/" + version);
    }
    return result;
  }

  private static void requireSchema(
      WorkflowDefinition definition,
      int expected,
      String writerName) {
    if (definition.getSchemaVersion() != expected) {
      throw new IllegalStateException(
          writerName + " Writer 不能修改 schemaVersion=" + definition.getSchemaVersion()
              + " 的工作流；格式迁移必须显式执行");
    }
  }

  private static void validate(WorkflowDTO dto) {
    if (dto == null) throw new IllegalArgumentException("工作流定义不能为空");
    validateCommon(dto.getCode(), dto.getName(), dto.getMaxParallelism());
  }

  private static void validate(WorkflowV2DTO dto) {
    if (dto == null) throw new IllegalArgumentException("Workflow V2 定义不能为空");
    validateCommon(dto.getCode(), dto.getName(), dto.getMaxParallelism());
  }

  private static void validate(WorkflowUpdateDTO dto) {
    if (dto == null) throw new IllegalArgumentException("工作流草稿不能为空");
    requireText(dto.getName(), "工作流名称");
    validateParallelism(dto.getMaxParallelism());
  }

  private static void validate(WorkflowV2UpdateDTO dto) {
    if (dto == null) throw new IllegalArgumentException("Workflow V2 草稿不能为空");
    requireText(dto.getName(), "工作流名称");
    validateParallelism(dto.getMaxParallelism());
  }

  private static void validateCommon(String code, String name, int maxParallelism) {
    requireText(code, "工作流编码");
    requireText(name, "工作流名称");
    validateParallelism(maxParallelism);
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
