package io.yak.ops.application.service.application.job;

import io.yak.ops.application.port.EngineEndpointRepository;
import io.yak.ops.application.service.BatchJobInstanceService;
import io.yak.ops.dao.entity.JobInstance;
import io.yak.ops.domain.enums.JobStatus;
import io.yak.ops.engine.api.*;
import io.yak.ops.application.model.vo.JobInstanceVO;
import java.util.Date;
import org.springframework.stereotype.Component;

@Component
public class SynchronizeJobStatusUseCase {
 private final BatchJobInstanceService instances; private final EngineEndpointRepository endpoints; private final EngineGatewayRegistry gateways;
 public SynchronizeJobStatusUseCase(BatchJobInstanceService instances, EngineEndpointRepository endpoints, EngineGatewayRegistry gateways){this.instances=instances;this.endpoints=endpoints;this.gateways=gateways;}
 public JobExecution synchronize(Long instanceId) {
  JobInstanceVO instance=instances.selectById(instanceId);
  if(instance==null || instance.getClientId()==null || instance.getEngineJobId()==null) throw new IllegalArgumentException("Execution has no engine identity: "+instanceId);
  EngineEndpoint endpoint=endpoints.findById(String.valueOf(instance.getClientId())).orElseThrow(() -> new IllegalArgumentException("Engine endpoint does not exist"));
  JobExecution execution=gateways.get(endpoint.engine()).execution(endpoint, String.valueOf(instanceId), instance.getEngineJobId());
  if (execution.status().terminal()) { JobInstance update=new JobInstance(); update.setId(instanceId); update.setJobStatus(toLocal(execution.status())); update.setErrorMessage(execution.diagnosticMessage()); update.setEndTime(new Date()); instances.updateById(update); }
  return execution;
 }
 private JobStatus toLocal(JobExecutionStatus status) { switch (status) { case SUCCEEDED: return JobStatus.FINISHED; case CANCELED: return JobStatus.CANCELED; default: return JobStatus.FAILED; } }
}
