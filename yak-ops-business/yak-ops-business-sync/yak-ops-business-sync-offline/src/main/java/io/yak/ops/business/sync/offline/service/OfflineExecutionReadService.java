package io.yak.ops.business.sync.offline.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.framework.common.PagingData;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.dao.OfflineJobExecutionDao;
import io.yak.ops.business.sync.offline.engine.LinkUpClient;
import io.yak.ops.business.sync.offline.repository.OfflineExecutionControlRepository;
import io.yak.ops.business.sync.offline.repository.OfflineExecutionControlRepository.ExecutionEventRecord;
import io.yak.ops.common.bean.dto.sync.offline.OfflineJobExecutionQueryDTO;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobExecutionPO;
import io.yak.ops.common.bean.vo.sync.offline.OfflineJobExecutionDetailVO;
import io.yak.ops.common.bean.vo.sync.offline.OfflineJobExecutionVO;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/** 执行实例、指标和状态事件读模型。 */
@ConditionalOnOfflineSyncEnabled @Component @RequiredArgsConstructor
public class OfflineExecutionReadService {
  private static final DateTimeFormatter FORMAT=DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
  private final OfflineJobExecutionDao executionDao;private final OfflineExecutionControlRepository repository;private final LinkUpClient linkUpClient;
  public OfflineJobExecutionPO require(Long id){if(id==null||id<=0)throw new IllegalArgumentException("任务实例 ID 不合法");OfflineJobExecutionPO e=executionDao.selectById(id);if(e==null)throw new IllegalArgumentException("离线同步任务实例不存在："+id);return e;}
  public PagingData<OfflineJobExecutionVO> page(OfflineJobExecutionQueryDTO dto){IPage<OfflineJobExecutionPO> page=executionDao.selectPage(dto);List<OfflineJobExecutionVO> list=new ArrayList<>();for(OfflineJobExecutionPO e:page.getRecords())list.add(toVO(e));return new PagingData<>(list,page);}
  public OfflineJobExecutionDetailVO detail(Long id){OfflineJobExecutionPO e=require(id);OfflineJobExecutionDetailVO detail=OfflineJobExecutionDetailVO.builder().execution(toVO(e)).build();if(StringUtils.hasText(e.getEngineSnapshotJson()))try{JsonNode snapshot=new ObjectMapper().readTree(e.getEngineSnapshotJson());detail.setJob(snapshot);detail.setPipelines(snapshot.path("pipelines"));detail.setTasks(snapshot.path("tasks"));detail.setMetrics(snapshot.path("metrics"));}catch(Exception ignored){}return detail;}
  public JsonNode tableMetrics(Long id){OfflineJobExecutionPO e=require(id);if(!StringUtils.hasText(e.getEngineJobId()))throw new IllegalStateException("当前执行实例尚未获得 Link-Up jobId");return linkUpClient.pipelines(e.getEngineJobId());}
  public String logs(Long id){OfflineJobExecutionPO e=require(id);StringBuilder log=new StringBuilder("# Yak Ops Offline Sync\n");log.append("definitionId: ").append(e.getJobDefinitionId()).append('\n').append("executionId: ").append(e.getId()).append('\n').append("definitionVersion: ").append(value(e.getDefinitionVersion())).append('\n').append("externalExecutionId: ").append(text(e.getExternalExecutionId())).append('\n').append("engineBaseUrl: ").append(text(e.getEngineBaseUrl())).append('\n').append("workerInstanceId: ").append(text(e.getWorkerInstanceId())).append('\n').append("engineJobId: ").append(text(e.getEngineJobId())).append('\n').append("status: ").append(text(e.getStatus())).append('\n').append("attemptNo: ").append(value(e.getAttemptNo())).append('\n').append("sourceRecordCount: ").append(value(e.getSourceRecordCount())).append('\n').append("sinkSuccessRecordCount: ").append(value(e.getSinkSuccessRecordCount())).append('\n').append("durationMillis: ").append(value(e.getDurationMillis())).append('\n');if(StringUtils.hasText(e.getErrorMessage()))log.append("error: ").append(e.getErrorMessage()).append('\n');log.append("\n# State Events\n");for(ExecutionEventRecord event:repository.listExecutionEvents(id)){log.append(format(event.getCreateTime())).append(" [").append(event.getEventType()).append("] ").append(text(event.getFromStatus())).append(" -> ").append(text(event.getToStatus()));if(StringUtils.hasText(event.getMessage()))log.append(" | ").append(event.getMessage());log.append('\n');}return log.toString();}
  public OfflineJobExecutionVO toVO(OfflineJobExecutionPO e){return OfflineJobExecutionVO.builder().id(e.getId()).jobDefinitionId(e.getJobDefinitionId()).definitionVersion(e.getDefinitionVersion()).engineBaseUrl(e.getEngineBaseUrl()).engineJobId(e.getEngineJobId()).externalExecutionId(e.getExternalExecutionId()).workerInstanceId(e.getWorkerInstanceId()).status(e.getStatus()).stateVersion(value(e.getStateVersion())).attemptNo(value(e.getAttemptNo())).triggerType(e.getTriggerType()).retryFromExecutionId(e.getRetryFromExecutionId()).cancellationRequested(Boolean.TRUE.equals(e.getCancellationRequested())).errorMessage(e.getErrorMessage()).sourceRecordCount(value(e.getSourceRecordCount())).sinkSuccessRecordCount(value(e.getSinkSuccessRecordCount())).sourceReadBytes(value(e.getSourceReadBytes())).sinkWrittenBytes(value(e.getSinkWrittenBytes())).qps(e.getQps()==null?0:e.getQps()).durationMillis(value(e.getDurationMillis())).createTime(format(e.getCreateTime())).startTime(format(e.getStartTime())).endTime(format(e.getEndTime())).nextRetryTime(format(e.getNextRetryTime())).lastSyncTime(format(e.getLastSyncTime())).updateTime(format(e.getUpdateTime())).build();}
  private String format(LocalDateTime v){return v==null?null:v.format(FORMAT);}private String text(String v){return StringUtils.hasText(v)?v:"-";}private long value(Long v){return v==null?0:v;}private int value(Integer v){return v==null?0:v;}
}
