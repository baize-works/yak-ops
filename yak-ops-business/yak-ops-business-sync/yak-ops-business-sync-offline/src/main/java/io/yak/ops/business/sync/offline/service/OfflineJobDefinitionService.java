package io.yak.ops.business.sync.offline.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.fasterxml.jackson.databind.JsonNode;
import io.yak.framework.common.PagingData;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.dao.OfflineJobDefinitionDao;
import io.yak.ops.business.sync.offline.domain.OfflineExecutionStatus;
import io.yak.ops.business.sync.offline.repository.OfflineDefinitionCatalogRepository;
import io.yak.ops.business.sync.offline.repository.OfflineDefinitionCatalogRepository.DefinitionVersion;
import io.yak.ops.business.sync.offline.repository.OfflineExecutionControlRepository;
import io.yak.ops.business.sync.offline.repository.OfflineScheduleRepository;
import io.yak.ops.business.sync.offline.repository.OfflineScheduleRepository.ScheduleRecord;
import io.yak.ops.business.sync.offline.service.OfflineDefinitionSupport.DraftDefinition;
import io.yak.ops.business.sync.offline.service.OfflineDefinitionSupport.PreparedDefinition;
import io.yak.ops.business.sync.offline.worker.OfflineCapabilityRequirementResolver;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerScheduler;
import io.yak.ops.common.bean.dto.sync.offline.OfflineJobDefinitionDTO;
import io.yak.ops.common.bean.dto.sync.offline.OfflineJobDefinitionQueryDTO;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobDefinitionPO;
import io.yak.ops.common.bean.vo.sync.offline.OfflineJobDefinitionVO;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * 离线同步任务定义与版本管理服务。
 *
 * @author weifuwan
 */
@ConditionalOnOfflineSyncEnabled
@Service
@RequiredArgsConstructor
public class OfflineJobDefinitionService {

  private final OfflineJobDefinitionDao definitionDao;
  private final OfflineDefinitionCatalogRepository catalogRepository;
  private final OfflineScheduleRepository scheduleRepository;
  private final OfflineExecutionControlRepository executionRepository;
  private final OfflineDefinitionSupport support;
  private final OfflineWorkerScheduler workerScheduler;
  private final OfflineCapabilityRequirementResolver capabilityResolver;
  private final AtomicLong idSequence = new AtomicLong(System.currentTimeMillis() * 1000L);

  public Long nextId() {
    long floor = System.currentTimeMillis() * 1000L;
    long candidate = idSequence.updateAndGet(current -> Math.max(current + 1L, floor));
    while (definitionDao.selectById(candidate) != null) {
      candidate = idSequence.incrementAndGet();
    }
    return candidate;
  }

  /** Creates the lightweight task shell used before datasource and table configuration. */
  @Transactional(transactionManager = "offlineSyncTransactionManager", rollbackFor = Exception.class)
  public Long saveDraft(OfflineJobDefinitionDTO requestDTO) {
    if (requestDTO == null) {
      throw new IllegalArgumentException("任务定义不能为空");
    }
    Long id = requestDTO.getId();
    if (id == null || id <= 0L) {
      id = nextId();
      requestDTO.setId(id);
    }
    OfflineJobDefinitionPO existing = definitionDao.selectById(id);
    ensureEditable(existing);
    if (existing != null && existing.getCurrentVersionId() != null) {
      throw new IllegalStateException("已生成可执行版本的任务不能退回草稿");
    }

    DraftDefinition draft = support.prepareDraft(requestDTO);
    if (definitionDao.existsByName(draft.getJobName(), id)) {
      throw new IllegalArgumentException("离线同步任务名称已存在：" + draft.getJobName());
    }

    JsonNode schedule = draft.getRequest().get("schedule");
    LocalDateTime now = LocalDateTime.now();
    OfflineJobDefinitionPO definition = existing == null
        ? new OfflineJobDefinitionPO()
        : existing;
    definition.setId(id);
    definition.setJobName(draft.getJobName());
    definition.setJobDesc(draft.getJobDesc());
    definition.setMode(draft.getMode());
    definition.setDefinitionJson(draft.getDefinitionJson());
    definition.setJobSpecJson(null);
    definition.setHoconConfig(null);
    definition.setReleaseState("OFFLINE");
    definition.setSourceType(draft.getSourceType());
    definition.setSinkType(draft.getSinkType());
    definition.setSourceDatasourceId(null);
    definition.setSinkDatasourceId(null);
    definition.setSourceTable(null);
    definition.setSinkTable(null);
    definition.setScheduleJson(support.writeNullable(schedule));
    definition.setEnvJson(null);
    ensureDefaultWorkerPolicy(definition);
    definition.setCapabilityRequirementsJson(null);
    definition.setVersion(0);
    definition.setCurrentVersionId(null);
    definition.setCreateTime(existing == null ? now : existing.getCreateTime());
    definition.setUpdateTime(now);

    if (existing == null) {
      definitionDao.insert(definition);
    } else {
      definitionDao.updateById(definition);
    }
    scheduleRepository.saveSchedule(id, schedule);
    return id;
  }

  @Transactional(transactionManager = "offlineSyncTransactionManager", rollbackFor = Exception.class)
  public Long saveGuide(OfflineJobDefinitionDTO requestDTO) {
    if (requestDTO == null) {
      throw new IllegalArgumentException("任务定义不能为空");
    }
    Long id = requestDTO.getId();
    if (id == null || id <= 0L) {
      id = nextId();
      requestDTO.setId(id);
    }
    OfflineJobDefinitionPO existing = definitionDao.selectById(id);
    ensureEditable(existing);
    PreparedDefinition prepared = support.prepare(requestDTO);
    String capabilityRequirementsJson = capabilityResolver.resolve(prepared.getJobSpecJson());
    if (definitionDao.existsByName(prepared.getJobName(), id)) {
      throw new IllegalArgumentException("离线同步任务名称已存在：" + prepared.getJobName());
    }

    JsonNode schedule = prepared.getRequest().get("schedule");
    int currentVersion = existing == null || existing.getVersion() == null
        ? 0
        : Math.max(0, existing.getVersion());
    int version = currentVersion + 1;
    LocalDateTime now = LocalDateTime.now();
    OfflineJobDefinitionPO definition = existing == null
        ? new OfflineJobDefinitionPO()
        : existing;
    definition.setId(id);
    definition.setJobName(prepared.getJobName());
    definition.setJobDesc(prepared.getJobDesc());
    definition.setMode(prepared.getMode());
    definition.setDefinitionJson(prepared.getDefinitionJson());
    definition.setJobSpecJson(prepared.getJobSpecJson());
    definition.setHoconConfig(null);
    definition.setSourceType(displayType(prepared.getSource(), prepared.getSourceConnectorId()));
    definition.setSinkType(displayType(prepared.getSink(), prepared.getSinkConnectorId()));
    definition.setSourceDatasourceId(id(prepared.getSource()));
    definition.setSinkDatasourceId(id(prepared.getSink()));
    definition.setSourceTable(prepared.getSourceTable());
    definition.setSinkTable(prepared.getSinkTable());
    definition.setScheduleJson(support.writeNullable(schedule));
    definition.setEnvJson(null);
    ensureDefaultWorkerPolicy(definition);
    definition.setCapabilityRequirementsJson(capabilityRequirementsJson);
    definition.setVersion(version);
    definition.setReleaseState(existing == null ? "OFFLINE" : existing.getReleaseState());
    definition.setCreateTime(existing == null ? now : existing.getCreateTime());
    definition.setUpdateTime(now);
    if (existing == null) {
      definitionDao.insert(definition);
    } else {
      definitionDao.updateById(definition);
    }

    Long versionId = catalogRepository.saveVersion(
        id,
        version,
        prepared.getDefinitionJson(),
        prepared.getJobSpecJson(),
        prepared.getDigest(),
        capabilityRequirementsJson);
    definition.setCurrentVersionId(versionId);
    definitionDao.updateById(definition);
    scheduleRepository.saveSchedule(id, schedule);
    return id;
  }

  /** Existing preview endpoint now returns a logical structured JobSpec. */
  public String buildGuideConfig(OfflineJobDefinitionDTO requestDTO) {
    return support.buildJobSpec(requestDTO);
  }

  public String resolveLogicalJobSpec(DefinitionVersion version) {
    if (version == null) {
      throw new IllegalArgumentException("任务版本不能为空");
    }
    return StringUtils.hasText(version.getJobSpecJson())
        ? version.getJobSpecJson()
        : support.buildJobSpec(version.getDefinitionJson());
  }

  /** Resolves the latest datasource credentials only for the outbound Worker request. */
  public String resolveExecutionJobSpec(DefinitionVersion version) {
    return support.resolveExecutionJobSpec(resolveLogicalJobSpec(version));
  }

  /** Compatibility alias for callers that need the durable logical JobSpec. */
  public String resolveJobSpec(DefinitionVersion version) {
    return resolveLogicalJobSpec(version);
  }

  public OfflineJobDefinitionVO get(Long id) {
    return toVO(require(id));
  }

  public JsonNode getEditDetail(Long id) {
    return support.editDetail(require(id));
  }

  public PagingData<OfflineJobDefinitionVO> page(OfflineJobDefinitionQueryDTO queryDTO) {
    IPage<OfflineJobDefinitionPO> page = definitionDao.selectPage(queryDTO);
    List<OfflineJobDefinitionVO> records = new ArrayList<>(page.getRecords().size());
    for (OfflineJobDefinitionPO definition : page.getRecords()) {
      records.add(toVO(definition));
    }
    return new PagingData<>(records, page);
  }

  @Transactional(transactionManager = "offlineSyncTransactionManager", rollbackFor = Exception.class)
  public boolean online(Long id) {
    OfflineJobDefinitionPO definition = require(id);
    requireCurrentVersion(definition);
    workerScheduler.validateDefinition(definition);
    definition.setReleaseState("ONLINE");
    definition.setUpdateTime(LocalDateTime.now());
    return definitionDao.updateById(definition);
  }

  @Transactional(transactionManager = "offlineSyncTransactionManager", rollbackFor = Exception.class)
  public boolean offline(Long id) {
    OfflineJobDefinitionPO definition = require(id);
    if (executionRepository.hasActiveExecution(id)) {
      throw new IllegalStateException("运行中的任务不能下线，请先停止任务");
    }
    definition.setReleaseState("OFFLINE");
    definition.setUpdateTime(LocalDateTime.now());
    return definitionDao.updateById(definition);
  }

  @Transactional(transactionManager = "offlineSyncTransactionManager", rollbackFor = Exception.class)
  public boolean delete(Long id) {
    OfflineJobDefinitionPO definition = require(id);
    if ("ONLINE".equalsIgnoreCase(definition.getReleaseState())) {
      throw new IllegalStateException("已上线任务不能删除，请先下线");
    }
    if (executionRepository.hasActiveExecution(id)) {
      throw new IllegalStateException("运行中的任务不能删除");
    }
    scheduleRepository.deleteSchedule(id);
    return definitionDao.deleteById(id);
  }

  public OfflineJobDefinitionPO require(Long id) {
    if (id == null || id <= 0L) {
      throw new IllegalArgumentException("任务定义 ID 不合法");
    }
    OfflineJobDefinitionPO definition = definitionDao.selectById(id);
    if (definition == null) {
      throw new IllegalArgumentException("离线同步任务不存在：" + id);
    }
    return definition;
  }

  public DefinitionVersion requireCurrentVersion(OfflineJobDefinitionPO definition) {
    if (definition == null || definition.getCurrentVersionId() == null) {
      throw new IllegalStateException("任务仍是草稿，请完成配置并保存后再上线或运行");
    }
    DefinitionVersion version = catalogRepository.findCurrentVersion(
        definition.getId(), definition.getCurrentVersionId());
    if (version == null) {
      throw new IllegalStateException("任务没有可执行的定义版本");
    }
    return version;
  }

  public List<Map<String, Object>> listVersionSummaries(Long definitionId) {
    require(definitionId);
    List<Map<String, Object>> result = new ArrayList<>();
    for (DefinitionVersion version : catalogRepository.listVersions(definitionId)) {
      Map<String, Object> item = new LinkedHashMap<>();
      item.put("id", version.getId());
      item.put("version", version.getVersionNo());
      item.put(
          "format",
          StringUtils.hasText(version.getJobSpecJson()) ? "JOB_SPEC" : "LEGACY_DERIVED");
      item.put("configDigest", version.getConfigDigest());
      item.put("capabilityRequirements", version.getCapabilityRequirementsJson());
      item.put("createTime", version.getCreateTime());
      result.add(item);
    }
    return result;
  }

  private OfflineJobDefinitionVO toVO(OfflineJobDefinitionPO definition) {
    ScheduleRecord schedule = scheduleRepository.findSchedule(definition.getId());
    OfflineJobDefinitionVO view = support.toVO(
        definition,
        schedule == null ? null : schedule.getCronExpression(),
        schedule != null && schedule.isEnabled(),
        schedule == null ? null : schedule.getLastFireTime(),
        schedule == null ? null : schedule.getNextFireTime());
    view.setWorkerSelectMode(
        StringUtils.hasText(definition.getWorkerSelectMode())
            ? definition.getWorkerSelectMode() : "AUTO");
    view.setWorkerNodeId(definition.getWorkerNodeId());
    view.setWorkerNodeName(workerScheduler.nodeName(definition.getWorkerNodeId()));
    view.setWorkerRequiredLabels(
        workerScheduler.labels(definition.getWorkerRequiredLabelsJson()));
    return view;
  }

  private void ensureDefaultWorkerPolicy(OfflineJobDefinitionPO definition) {
    if (!StringUtils.hasText(definition.getWorkerSelectMode())) {
      definition.setWorkerSelectMode("AUTO");
    }
    if (!StringUtils.hasText(definition.getWorkerRequiredLabelsJson())) {
      definition.setWorkerRequiredLabelsJson("{}");
    }
  }

  private void ensureEditable(OfflineJobDefinitionPO existing) {
    if (existing == null) {
      return;
    }
    if ("ONLINE".equalsIgnoreCase(existing.getReleaseState())) {
      throw new IllegalStateException("已上线任务不能修改，请先下线");
    }
    if (OfflineExecutionStatus.isActive(existing.getLastJobStatus())
        || executionRepository.hasActiveExecution(existing.getId())) {
      throw new IllegalStateException("运行中的任务不能修改");
    }
  }

  private Long id(io.yak.ops.common.bean.po.datasource.DataSourcePO source) {
    return source == null ? null : source.getId();
  }

  private String displayType(
      io.yak.ops.common.bean.po.datasource.DataSourcePO source,
      String connectorId) {
    return source != null && source.getDbType() != null
        ? source.getDbType().name()
        : connectorId;
  }
}
