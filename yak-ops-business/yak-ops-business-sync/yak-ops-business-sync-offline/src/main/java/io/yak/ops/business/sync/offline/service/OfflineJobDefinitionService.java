package io.yak.ops.business.sync.offline.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.fasterxml.jackson.databind.JsonNode;
import io.yak.framework.common.PagingData;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.dao.OfflineJobDefinitionDao;
import io.yak.ops.business.sync.offline.domain.OfflineExecutionStatus;
import io.yak.ops.business.sync.offline.repository.OfflineExecutionControlRepository;
import io.yak.ops.business.sync.offline.repository.OfflineScheduleRepository;
import io.yak.ops.business.sync.offline.service.OfflineDefinitionSupport.DraftDefinition;
import io.yak.ops.business.sync.offline.service.OfflineDefinitionSupport.PreparedDefinition;
import io.yak.ops.common.bean.dto.sync.offline.OfflineJobDefinitionDTO;
import io.yak.ops.common.bean.dto.sync.offline.OfflineJobDefinitionQueryDTO;
import io.yak.ops.common.bean.po.datasource.DataSourcePO;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobDefinitionPO;
import io.yak.ops.common.bean.vo.sync.offline.OfflineJobDefinitionVO;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/** 离线同步当前定义管理，不维护独立版本表。 */
@ConditionalOnOfflineSyncEnabled
@Service
@RequiredArgsConstructor
public class OfflineJobDefinitionService {
  private final OfflineJobDefinitionDao definitionDao;
  private final OfflineScheduleRepository scheduleRepository;
  private final OfflineExecutionControlRepository executionRepository;
  private final OfflineDefinitionSupport support;
  private final AtomicLong idSequence = new AtomicLong(System.currentTimeMillis() * 1000L);

  public Long nextId() {
    long floor=System.currentTimeMillis()*1000L;
    long value=idSequence.updateAndGet(current->Math.max(current+1,floor));
    while(definitionDao.selectById(value)!=null)value=idSequence.incrementAndGet();
    return value;
  }

  @Transactional(transactionManager="offlineSyncTransactionManager",rollbackFor=Exception.class)
  public Long saveDraft(OfflineJobDefinitionDTO dto) {
    if(dto==null)throw new IllegalArgumentException("任务定义不能为空");
    Long id=dto.getId(); if(id==null||id<=0){id=nextId();dto.setId(id);} OfflineJobDefinitionPO existing=definitionDao.selectById(id); ensureEditable(existing);
    if(existing!=null&&StringUtils.hasText(existing.getJobSpecJson()))throw new IllegalStateException("已生成可执行配置的任务不能退回草稿");
    DraftDefinition draft=support.prepareDraft(dto); if(definitionDao.existsByName(draft.getJobName(),id))throw new IllegalArgumentException("离线同步任务名称已存在："+draft.getJobName());
    LocalDateTime now=LocalDateTime.now(); OfflineJobDefinitionPO d=existing==null?new OfflineJobDefinitionPO():existing;
    d.setId(id);d.setJobName(draft.getJobName());d.setJobDesc(draft.getJobDesc());d.setMode(draft.getMode());d.setDefinitionJson(draft.getDefinitionJson());
    d.setJobSpecJson(null);d.setConfigDigest(null);d.setReleaseState("OFFLINE");d.setSourceType(draft.getSourceType());d.setSinkType(draft.getSinkType());
    d.setSourceDatasourceId(null);d.setSinkDatasourceId(null);d.setSourceTable(null);d.setSinkTable(null);d.setVersion(0);
    d.setCreateTime(existing==null?now:existing.getCreateTime());d.setUpdateTime(now);
    if(existing==null)definitionDao.insert(d);else definitionDao.updateById(d);
    scheduleRepository.saveSchedule(id,draft.getRequest().get("schedule")); return id;
  }

  @Transactional(transactionManager="offlineSyncTransactionManager",rollbackFor=Exception.class)
  public Long saveGuide(OfflineJobDefinitionDTO dto) {
    if(dto==null)throw new IllegalArgumentException("任务定义不能为空"); Long id=dto.getId();if(id==null||id<=0){id=nextId();dto.setId(id);}
    OfflineJobDefinitionPO existing=definitionDao.selectById(id);ensureEditable(existing);PreparedDefinition p=support.prepare(dto);
    if(definitionDao.existsByName(p.getJobName(),id))throw new IllegalArgumentException("离线同步任务名称已存在："+p.getJobName());
    LocalDateTime now=LocalDateTime.now();OfflineJobDefinitionPO d=existing==null?new OfflineJobDefinitionPO():existing;
    d.setId(id);d.setJobName(p.getJobName());d.setJobDesc(p.getJobDesc());d.setMode(p.getMode());d.setDefinitionJson(p.getDefinitionJson());
    d.setJobSpecJson(p.getJobSpecJson());d.setConfigDigest(p.getDigest());d.setReleaseState(existing==null?"OFFLINE":existing.getReleaseState());
    d.setSourceType(displayType(p.getSource(),p.getSourceConnectorId()));d.setSinkType(displayType(p.getSink(),p.getSinkConnectorId()));
    d.setSourceDatasourceId(id(p.getSource()));d.setSinkDatasourceId(id(p.getSink()));d.setSourceTable(p.getSourceTable());d.setSinkTable(p.getSinkTable());
    d.setVersion((existing==null||existing.getVersion()==null?0:Math.max(0,existing.getVersion()))+1);
    d.setCreateTime(existing==null?now:existing.getCreateTime());d.setUpdateTime(now);
    if(existing==null)definitionDao.insert(d);else definitionDao.updateById(d);
    scheduleRepository.saveSchedule(id,p.getRequest().get("schedule"));return id;
  }

  public String buildGuideConfig(OfflineJobDefinitionDTO dto){return support.buildJobSpec(dto);}
  public String resolveLogicalJobSpec(OfflineJobDefinitionPO d){if(d==null||!StringUtils.hasText(d.getJobSpecJson()))throw new IllegalStateException("任务仍是草稿，请完成配置并保存");return d.getJobSpecJson();}
  public String resolveExecutionJobSpec(OfflineJobDefinitionPO d){return support.resolveExecutionJobSpec(resolveLogicalJobSpec(d));}
  public OfflineJobDefinitionVO get(Long id){return support.toVO(require(id));}
  public JsonNode getEditDetail(Long id){return support.editDetail(require(id));}
  public PagingData<OfflineJobDefinitionVO> page(OfflineJobDefinitionQueryDTO query){IPage<OfflineJobDefinitionPO> page=definitionDao.selectPage(query);List<OfflineJobDefinitionVO> list=new ArrayList<>();for(OfflineJobDefinitionPO d:page.getRecords())list.add(support.toVO(d));return new PagingData<>(list,page);}

  @Transactional(transactionManager="offlineSyncTransactionManager",rollbackFor=Exception.class)
  public boolean online(Long id){OfflineJobDefinitionPO d=require(id);resolveLogicalJobSpec(d);d.setReleaseState("ONLINE");d.setUpdateTime(LocalDateTime.now());return definitionDao.updateById(d);}
  @Transactional(transactionManager="offlineSyncTransactionManager",rollbackFor=Exception.class)
  public boolean offline(Long id){OfflineJobDefinitionPO d=require(id);if(executionRepository.hasActiveExecution(id))throw new IllegalStateException("运行中的任务不能下线，请先停止任务");d.setReleaseState("OFFLINE");d.setUpdateTime(LocalDateTime.now());return definitionDao.updateById(d);}
  @Transactional(transactionManager="offlineSyncTransactionManager",rollbackFor=Exception.class)
  public boolean delete(Long id){OfflineJobDefinitionPO d=require(id);if("ONLINE".equalsIgnoreCase(d.getReleaseState()))throw new IllegalStateException("已上线任务不能删除，请先下线");if(executionRepository.hasActiveExecution(id))throw new IllegalStateException("运行中的任务不能删除");return definitionDao.deleteById(id);}

  public OfflineJobDefinitionPO require(Long id){if(id==null||id<=0)throw new IllegalArgumentException("任务定义 ID 不合法");OfflineJobDefinitionPO d=definitionDao.selectById(id);if(d==null)throw new IllegalArgumentException("离线同步任务不存在："+id);return d;}
  private void ensureEditable(OfflineJobDefinitionPO d){if(d==null)return;if("ONLINE".equalsIgnoreCase(d.getReleaseState()))throw new IllegalStateException("已上线任务不能修改，请先下线");if(OfflineExecutionStatus.isActive(d.getLastJobStatus())||executionRepository.hasActiveExecution(d.getId()))throw new IllegalStateException("运行中的任务不能修改");}
  private Long id(DataSourcePO source){return source==null?null:source.getId();}
  private String displayType(DataSourcePO source,String connectorId){return source!=null&&source.getDbType()!=null?source.getDbType().name():connectorId;}
}
