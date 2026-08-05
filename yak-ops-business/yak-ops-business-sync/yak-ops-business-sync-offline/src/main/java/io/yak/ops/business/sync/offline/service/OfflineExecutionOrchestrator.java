package io.yak.ops.business.sync.offline.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.config.OfflineSyncProperties;
import io.yak.ops.business.sync.offline.dao.OfflineJobDefinitionDao;
import io.yak.ops.business.sync.offline.dao.OfflineJobExecutionDao;
import io.yak.ops.business.sync.offline.domain.OfflineExecutionStatus;
import io.yak.ops.business.sync.offline.engine.LinkUpClient;
import io.yak.ops.business.sync.offline.engine.LinkUpClient.LinkUpJobResponse;
import io.yak.ops.business.sync.offline.engine.LinkUpClient.LinkUpRequestException;
import io.yak.ops.business.sync.offline.engine.LinkUpClient.LinkUpTransportException;
import io.yak.ops.business.sync.offline.repository.OfflineExecutionControlRepository;
import io.yak.ops.business.sync.offline.repository.OfflineScheduleRepository;
import io.yak.ops.business.sync.offline.repository.OfflineScheduleRepository.ScheduleRecord;
import io.yak.ops.business.sync.offline.service.OfflineExecutionClaimService.ClaimResult;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobDefinitionPO;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobExecutionPO;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/** 离线任务提交、取消和状态落库。 */
@ConditionalOnOfflineSyncEnabled
@Component
public class OfflineExecutionOrchestrator {
  private final OfflineJobDefinitionService definitionService; private final OfflineExecutionClaimService claimService;
  private final OfflineJobDefinitionDao definitionDao; private final OfflineJobExecutionDao executionDao;
  private final OfflineExecutionControlRepository executionRepository; private final OfflineScheduleRepository scheduleRepository;
  private final LinkUpClient linkUpClient; private final OfflineSyncProperties properties; private final ObjectMapper objectMapper;
  public OfflineExecutionOrchestrator(OfflineJobDefinitionService definitionService,OfflineExecutionClaimService claimService,
      OfflineJobDefinitionDao definitionDao,OfflineJobExecutionDao executionDao,OfflineExecutionControlRepository executionRepository,
      OfflineScheduleRepository scheduleRepository,LinkUpClient linkUpClient,OfflineSyncProperties properties,
      @Qualifier("offlineSyncJsonMapper") ObjectMapper objectMapper){this.definitionService=definitionService;this.claimService=claimService;this.definitionDao=definitionDao;this.executionDao=executionDao;this.executionRepository=executionRepository;this.scheduleRepository=scheduleRepository;this.linkUpClient=linkUpClient;this.properties=properties;this.objectMapper=objectMapper;}

  public OfflineJobExecutionPO execute(Long definitionId,String triggerType,Long retryFromExecutionId,int attemptNo){
    ClaimResult claim=claimService.claim(definitionId,triggerType,retryFromExecutionId,attemptNo);OfflineJobExecutionPO execution=claim.getExecution();
    record(execution,null,execution.getStatus(),"EXECUTION_CREATED","使用 application.yml 中的固定 Link-Up 地址",null);
    try{
      String resolved=definitionService.resolveExecutionJobSpec(claim.getDefinition());JsonNode jobSpec=readJobSpec(resolved);
      transition(execution,OfflineExecutionStatus.SUBMITTED,"SUBMITTING","正在向 Link-Up 提交 JobSpec",null);
      LinkUpJobResponse response=linkUpClient.submit(execution.getExternalExecutionId(),execution.getIdempotencyKey(),execution.getDefinitionVersion(),jobSpec);
      applySnapshot(execution,response,"SUBMITTED");return execution;
    }catch(LinkUpRequestException e){markTerminal(execution,OfflineExecutionStatus.FAILED,e.getCode()+"："+e.getMessage(),null,e.getStatusCode()==429||e.getStatusCode()>=500);throw e;
    }catch(LinkUpTransportException e){if(e.isUncertain()){execution.setErrorMessage(e.getMessage());execution.setLastSyncTime(LocalDateTime.now());execution.setUpdateTime(LocalDateTime.now());executionDao.updateById(execution);record(execution,execution.getStatus(),execution.getStatus(),"SUBMIT_UNCERTAIN",e.getMessage(),null);return execution;}markTerminal(execution,OfflineExecutionStatus.FAILED,e.getMessage(),null,true);throw e;
    }catch(RuntimeException e){markTerminal(execution,OfflineExecutionStatus.FAILED,e.getMessage(),null,false);throw e;}
  }

  public OfflineJobExecutionPO retryFrom(OfflineJobExecutionPO previous){if(previous==null||previous.getId()==null)throw new IllegalArgumentException("重试来源实例不能为空");return execute(previous.getJobDefinitionId(),"RETRY",previous.getId(),value(previous.getAttemptNo(),1)+1);}
  public OfflineJobExecutionPO cancel(Long id){OfflineJobExecutionPO e=require(id);if(!OfflineExecutionStatus.isActive(e.getStatus()))throw new IllegalStateException("当前执行实例已结束，无需停止");e.setCancellationRequested(true);e.setUpdateTime(LocalDateTime.now());executionDao.updateById(e);record(e,e.getStatus(),e.getStatus(),"CANCEL_REQUESTED","Yak Ops 已记录取消意图",null);if(StringUtils.hasText(e.getEngineJobId()))applySnapshot(e,linkUpClient.cancel(e.getEngineJobId()),"CANCEL_ACCEPTED");return e;}

  public void applySnapshot(OfflineJobExecutionPO e,LinkUpJobResponse response,String eventType){if(e==null||response==null)return;String previous=e.getStatus();OfflineExecutionStatus next=StringUtils.hasText(response.getStatus())?OfflineExecutionStatus.parse(response.getStatus()):OfflineExecutionStatus.parse(e.getStatus());
    e.setEngineJobId(first(response.getJobId(),e.getEngineJobId()));e.setWorkerInstanceId(first(response.getWorkerInstanceId(),e.getWorkerInstanceId()));e.setStatus(next.name());
    e.setStateVersion(Math.max(value(e.getStateVersion(),0L),value(response.getStateVersion(),0L)));e.setCancellationRequested(Boolean.TRUE.equals(response.getCancellationRequested())||Boolean.TRUE.equals(e.getCancellationRequested()));
    e.setEngineSnapshotJson(write(response));e.setErrorMessage(response.getErrorMessage());JsonNode metrics=response.getMetrics();e.setSourceRecordCount(number(metrics,"sourceRecordCount",0));e.setSinkSuccessRecordCount(number(metrics,"sinkSuccessRecordCount",0));
    e.setSourceReadBytes(number(metrics,"sourceReadBytes",0));e.setSinkWrittenBytes(number(metrics,"sinkWrittenBytes",0));e.setQps(decimal(metrics,"sourceAverageQps",decimal(metrics,"sinkAverageQps",0D)));e.setDurationMillis(value(response.getDurationMillis(),0L));
    e.setStartTime(time(response.getStartTimeMillis()));e.setEndTime(time(response.getEndTimeMillis()));e.setLastSyncTime(LocalDateTime.now());e.setUpdateTime(LocalDateTime.now());configureRetry(e,next,retryable(response,next));executionDao.updateById(e);updateDefinition(e,next);
    if(!next.name().equals(previous))record(e,previous,next.name(),eventType,response.getErrorMessage(),e.getEngineSnapshotJson());}

  public void markLost(OfflineJobExecutionPO e,String message){if(e!=null&&OfflineExecutionStatus.isActive(e.getStatus()))markTerminal(e,OfflineExecutionStatus.LOST,message,null,true);}
  public OfflineJobExecutionPO require(Long id){if(id==null||id<=0)throw new IllegalArgumentException("任务实例 ID 不合法");OfflineJobExecutionPO e=executionDao.selectById(id);if(e==null)throw new IllegalArgumentException("离线同步任务实例不存在："+id);return e;}
  private void markTerminal(OfflineJobExecutionPO e,OfflineExecutionStatus status,String message,String payload,boolean retryable){String previous=e.getStatus();e.setStatus(status.name());e.setStateVersion(value(e.getStateVersion(),0L)+1);e.setErrorMessage(message);e.setEndTime(LocalDateTime.now());e.setLastSyncTime(LocalDateTime.now());e.setUpdateTime(LocalDateTime.now());configureRetry(e,status,retryable);executionDao.updateById(e);updateDefinition(e,status);record(e,previous,status.name(),status.name(),message,payload);}
  private void updateDefinition(OfflineJobExecutionPO e,OfflineExecutionStatus status){OfflineJobDefinitionPO d=definitionDao.selectById(e.getJobDefinitionId());if(d==null)return;d.setLastExecutionId(e.getId());d.setLastEngineJobId(e.getEngineJobId());d.setLastJobStatus(status.name());d.setLastErrorMessage(e.getErrorMessage());d.setLastDurationMillis(e.getDurationMillis());d.setLastReadRowCount(e.getSourceRecordCount());d.setLastQps(e.getQps());d.setLastSyncBytes(Math.max(value(e.getSourceReadBytes(),0L),value(e.getSinkWrittenBytes(),0L)));d.setLastStartTime(e.getStartTime());d.setLastEndTime(e.getEndTime());d.setUpdateTime(LocalDateTime.now());definitionDao.updateById(d);}
  private void transition(OfflineJobExecutionPO e,OfflineExecutionStatus target,String type,String message,String payload){String previous=e.getStatus();e.setStatus(target.name());e.setStateVersion(value(e.getStateVersion(),0L)+1);e.setUpdateTime(LocalDateTime.now());executionDao.updateById(e);record(e,previous,target.name(),type,message,payload);}
  private void configureRetry(OfflineJobExecutionPO e,OfflineExecutionStatus status,boolean retryable){e.setNextRetryTime(null);if(!retryable||(status!=OfflineExecutionStatus.FAILED&&status!=OfflineExecutionStatus.LOST))return;ScheduleRecord schedule=scheduleRepository.findSchedule(e.getJobDefinitionId());int attempts=schedule==null?properties.getControl().getDefaultMaxAttempts():schedule.getRetryMaxAttempts();int backoff=schedule==null?properties.getControl().getDefaultRetryBackoffSeconds():schedule.getRetryBackoffSeconds();if(value(e.getAttemptNo(),1)<Math.max(1,attempts))e.setNextRetryTime(LocalDateTime.now().plusSeconds(Math.max(1,backoff)));}
  private boolean retryable(LinkUpJobResponse response,OfflineExecutionStatus status){if(status==OfflineExecutionStatus.LOST)return true;if(status!=OfflineExecutionStatus.FAILED)return false;String code=response==null?null:response.getErrorCode();if(!StringUtils.hasText(code))return true;String n=code.toUpperCase(java.util.Locale.ROOT);return !(n.contains("CONFIG")||n.contains("VALIDATION")||n.contains("IDEMPOTENCY")||n.contains("BAD_REQUEST")||n.contains("UNSUPPORTED"));}
  private JsonNode readJobSpec(String value){if(!StringUtils.hasText(value))throw new IllegalStateException("任务缺少 Link-Up JobSpec");try{JsonNode node=objectMapper.readTree(value);if(node==null||!node.isObject())throw new IllegalStateException("Link-Up JobSpec 不是 JSON 对象");return node;}catch(JsonProcessingException ex){throw new IllegalStateException("Link-Up JobSpec 已损坏",ex);}}
  private void record(OfflineJobExecutionPO e,String from,String to,String type,String message,String payload){executionRepository.recordExecutionEvent(e.getId(),value(e.getStateVersion(),0L),from,to,type,message,payload);}
  private String write(Object value){try{return objectMapper.writeValueAsString(value);}catch(JsonProcessingException ex){throw new IllegalStateException("序列化 Link-Up 执行快照失败",ex);}}
  private long number(JsonNode n,String f,long fallback){JsonNode v=n==null?null:n.get(f);return v==null||!v.isNumber()?fallback:v.asLong(fallback);}private double decimal(JsonNode n,String f,double fallback){JsonNode v=n==null?null:n.get(f);return v==null||!v.isNumber()?fallback:v.asDouble(fallback);}
  private LocalDateTime time(Long millis){return millis==null||millis<=0?null:LocalDateTime.ofInstant(Instant.ofEpochMilli(millis),ZoneId.systemDefault());}private String first(String v,String fallback){return StringUtils.hasText(v)?v:fallback;}
  private int value(Integer v,int f){return v==null?f:v;}private long value(Long v,long f){return v==null?f:v;}
}
