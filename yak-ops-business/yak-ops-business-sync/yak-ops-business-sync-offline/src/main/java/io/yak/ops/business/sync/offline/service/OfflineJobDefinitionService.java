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
import io.yak.ops.business.sync.offline.service.OfflineDefinitionSupport.PreparedDefinition;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/** Offline job definition catalog with immutable structured JobSpec versions. */
@ConditionalOnOfflineSyncEnabled
@Service
public class OfflineJobDefinitionService {

  private final OfflineJobDefinitionDao definitionDao;
  private final OfflineDefinitionCatalogRepository catalogRepository;
  private final OfflineScheduleRepository scheduleRepository;
  private final OfflineExecutionControlRepository executionRepository;
  private final OfflineDefinitionSupport support;
  private final AtomicLong idSequence = new AtomicLong(System.currentTimeMillis() * 1000L);

  public OfflineJobDefinitionService(
      OfflineJobDefinitionDao definitionDao,
      OfflineDefinitionCatalogRepository catalogRepository,
      OfflineScheduleRepository scheduleRepository,
      OfflineExecutionControlRepository executionRepository,
      OfflineDefinitionSupport support) {
    this.definitionDao = definitionDao;
    this.catalogRepository = catalogRepository;
    this.scheduleRepository = scheduleRepository;
    this.executionRepository = executionRepository;
    this.support = support;
  }

  public Long nextId() {
    long floor = System.currentTimeMillis() * 1000L;
    long candidate = idSequence.updateAndGet(current -> Math.max(current + 1L, floor));
    while (definitionDao.selectById(candidate) != null) candidate = idSequence.incrementAndGet();
    return candidate;
  }

  @Transactional(transactionManager = "offlineSyncTransactionManager", rollbackFor = Exception.class)
  public Long saveGuide(OfflineJobDefinitionDTO requestDTO) {
    Long id = requestDTO == null ? null : requestDTO.getId();
    if (id == null || id <= 0L) {
      id = nextId();
      requestDTO.setId(id);
    }
    OfflineJobDefinitionPO existing = definitionDao.selectById(id);
    ensureEditable(existing);
    PreparedDefinition prepared = support.prepare(requestDTO);
    if (definitionDao.existsByName(prepared.getJobName(), id)) {
      throw new IllegalArgumentException("离线同步任务名称已存在：" + prepared.getJobName());
    }

    int version = existing == null || existing.getVersion() == null ? 1 : existing.getVersion() + 1;
    LocalDateTime now = LocalDateTime.now();
    OfflineJobDefinitionPO definition = existing == null ? new OfflineJobDefinitionPO() : existing;
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
    definition.setScheduleJson(support.writeNullable(prepared.getRequest().get("schedule")));
    definition.setEnvJson(support.writeNullable(prepared.getRequest().get("env")));
    definition.setVersion(version);
    definition.setReleaseState(existing == null ? "OFFLINE" : existing.getReleaseState());
    definition.setCreateTime(existing == null ? now : existing.getCreateTime());
    definition.setUpdateTime(now);
    if (existing == null) definitionDao.insert(definition); else definitionDao.updateById(definition);

    Long versionId = catalogRepository.saveVersion(
        id, version, prepared.getDefinitionJson(), prepared.getJobSpecJson(), prepared.getDigest());
    definition.setCurrentVersionId(versionId);
    definitionDao.updateById(definition);
    scheduleRepository.saveSchedule(id, prepared.getRequest().get("schedule"));
    return id;
  }

  /** Existing preview endpoint now returns structured JSON JobSpec instead of HOCON text. */
  public String buildGuideConfig(OfflineJobDefinitionDTO requestDTO) {
    return support.buildJobSpec(requestDTO);
  }

  public String resolveJobSpec(DefinitionVersion version) {
    if (version == null) throw new IllegalArgumentException("任务版本不能为空");
    return StringUtils.hasText(version.getJobSpecJson())
        ? version.getJobSpecJson()
        : support.buildJobSpec(version.getDefinitionJson());
  }

  public OfflineJobDefinitionVO get(Long id) { return toVO(require(id)); }
  public JsonNode getEditDetail(Long id) { return support.editDetail(require(id)); }

  public PagingData<OfflineJobDefinitionVO> page(OfflineJobDefinitionQueryDTO queryDTO) {
    IPage<OfflineJobDefinitionPO> page = definitionDao.selectPage(queryDTO);
    List<OfflineJobDefinitionVO> records = new ArrayList<>(page.getRecords().size());
    for (OfflineJobDefinitionPO definition : page.getRecords()) records.add(toVO(definition));
    return new PagingData<>(records, page);
  }

  @Transactional(transactionManager = "offlineSyncTransactionManager", rollbackFor = Exception.class)
  public boolean online(Long id) {
    OfflineJobDefinitionPO definition = require(id);
    requireCurrentVersion(definition);
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
    if (executionRepository.hasActiveExecution(id)) throw new IllegalStateException("运行中的任务不能删除");
    return definitionDao.deleteById(id);
  }

  public OfflineJobDefinitionPO require(Long id) {
    if (id == null || id <= 0L) throw new IllegalArgumentException("任务定义 ID 不合法");
    OfflineJobDefinitionPO definition = definitionDao.selectById(id);
    if (definition == null) throw new IllegalArgumentException("离线同步任务不存在：" + id);
    return definition;
  }

  public DefinitionVersion requireCurrentVersion(OfflineJobDefinitionPO definition) {
    DefinitionVersion version = catalogRepository.findCurrentVersion(
        definition.getId(), definition.getCurrentVersionId());
    if (version == null) throw new IllegalStateException("任务没有可执行的定义版本");
    return version;
  }

  public List<Map<String, Object>> listVersionSummaries(Long definitionId) {
    require(definitionId);
    List<Map<String, Object>> result = new ArrayList<>();
    for (DefinitionVersion version : catalogRepository.listVersions(definitionId)) {
      Map<String, Object> item = new LinkedHashMap<>();
      item.put("id", version.getId());
      item.put("version", version.getVersionNo());
      item.put("format", StringUtils.hasText(version.getJobSpecJson()) ? "JOB_SPEC" : "LEGACY_DERIVED");
      item.put("configDigest", version.getConfigDigest());
      item.put("createTime", version.getCreateTime());
      result.add(item);
    }
    return result;
  }

  private OfflineJobDefinitionVO toVO(OfflineJobDefinitionPO definition) {
    ScheduleRecord schedule = scheduleRepository.findSchedule(definition.getId());
    return support.toVO(definition,
        schedule == null ? null : schedule.getCronExpression(),
        schedule != null && schedule.isEnabled(),
        schedule == null ? null : schedule.getLastFireTime(),
        schedule == null ? null : schedule.getNextFireTime());
  }

  private void ensureEditable(OfflineJobDefinitionPO existing) {
    if (existing == null) return;
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
