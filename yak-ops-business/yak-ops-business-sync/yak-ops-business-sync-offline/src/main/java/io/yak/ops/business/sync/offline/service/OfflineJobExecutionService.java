package io.yak.ops.business.sync.offline.service;

import com.fasterxml.jackson.databind.JsonNode;
import io.yak.framework.common.PagingData;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.engine.LinkUpClient.LinkUpJobResponse;
import io.yak.ops.common.bean.dto.sync.offline.OfflineBatchOperationDTO;
import io.yak.ops.common.bean.dto.sync.offline.OfflineJobExecutionQueryDTO;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobDefinitionPO;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobExecutionPO;
import io.yak.ops.common.bean.vo.sync.offline.*;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** 离线同步执行门面。 */
@ConditionalOnOfflineSyncEnabled @Service @RequiredArgsConstructor
public class OfflineJobExecutionService {
  private final OfflineExecutionOrchestrator orchestrator;private final OfflineExecutionReadService readService;private final OfflineJobDefinitionService definitionService;
  public OfflineJobExecutionVO execute(Long id){return readService.toVO(orchestrator.execute(id,"MANUAL",null,1));}
  public OfflineJobExecutionVO executeScheduled(Long id){return readService.toVO(orchestrator.execute(id,"SCHEDULE",null,1));}
  public OfflineJobExecutionVO retry(Long id){return readService.toVO(orchestrator.retryFrom(readService.require(id)));}
  public OfflineJobExecutionVO retryFrom(OfflineJobExecutionPO previous){return readService.toVO(orchestrator.retryFrom(previous));}
  public OfflineJobExecutionVO cancel(Long id){return readService.toVO(orchestrator.cancel(id));}
  public OfflineJobExecutionVO cancelLatest(Long definitionId){OfflineJobDefinitionPO d=definitionService.require(definitionId);if(d.getLastExecutionId()==null)throw new IllegalStateException("任务没有可停止的执行实例");return cancel(d.getLastExecutionId());}
  public OfflineBatchOperationVO batchExecute(OfflineBatchOperationDTO dto){return batch(dto,true);}public OfflineBatchOperationVO batchCancel(OfflineBatchOperationDTO dto){return batch(dto,false);}
  public PagingData<OfflineJobExecutionVO> page(OfflineJobExecutionQueryDTO dto){return readService.page(dto);}public OfflineJobExecutionDetailVO detail(Long id){return readService.detail(id);}
  public JsonNode tableMetrics(Long id){return readService.tableMetrics(id);}public String logs(Long id){return readService.logs(id);}
  public void applySnapshot(OfflineJobExecutionPO e,LinkUpJobResponse r,String type){orchestrator.applySnapshot(e,r,type);}public void markLost(OfflineJobExecutionPO e,String message){orchestrator.markLost(e,message);}
  private OfflineBatchOperationVO batch(OfflineBatchOperationDTO dto,boolean execute){if(dto==null||dto.getJobDefinitionIds()==null||dto.getJobDefinitionIds().isEmpty())throw new IllegalArgumentException("jobDefinitionIds 不能为空");int success=0;List<OfflineBatchOperationErrorVO> errors=new ArrayList<>();for(Long id:dto.getJobDefinitionIds()){try{if(id==null||id<=0)throw new IllegalArgumentException("任务定义 ID 不合法");if(execute)execute(id);else cancelLatest(id);success++;}catch(RuntimeException e){errors.add(OfflineBatchOperationErrorVO.builder().jobDefinitionId(id).message(e.getMessage()).build());}}return OfflineBatchOperationVO.builder().successCount(success).failedCount(errors.size()).errors(errors).build();}
}
