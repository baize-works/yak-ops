package io.baize.flow.application.service.application.job;

import io.baize.flow.application.service.BatchJobInstanceService;
import io.baize.flow.application.port.EngineEndpointRepository;
import io.baize.flow.dao.entity.JobInstance;
import io.baize.flow.web.contract.vo.JobInstanceVO;
import io.baize.flow.domain.enums.JobStatus;
import io.baize.flow.engine.api.EngineEndpoint;
import io.baize.flow.engine.api.EngineGatewayRegistry;
import io.baize.flow.engine.api.EngineJobSnapshot;
import io.baize.flow.engine.api.EngineJobStatus;
import java.util.Date;
import org.springframework.stereotype.Component;

/** Synchronizes a persisted execution from an engine-neutral snapshot. */
@Component
public class SynchronizeJobStatusUseCase {
 private final BatchJobInstanceService instances; private final EngineEndpointRepository endpoints; private final EngineGatewayRegistry gateways;
 public SynchronizeJobStatusUseCase(BatchJobInstanceService instances, EngineEndpointRepository endpoints, EngineGatewayRegistry gateways){this.instances=instances;this.endpoints=endpoints;this.gateways=gateways;}
 public EngineJobSnapshot synchronize(Long instanceId) {
  JobInstanceVO instance=instances.selectById(instanceId);
  if(instance==null || instance.getClientId()==null || instance.getEngineJobId()==null) throw new IllegalArgumentException("Execution has no engine identity: "+instanceId);
  String engineEndpointId=String.valueOf(instance.getClientId());
  EngineEndpoint endpoint=endpoints.findById(engineEndpointId).orElseThrow(() -> new IllegalArgumentException("Engine endpoint does not exist"));
  EngineJobSnapshot snapshot=gateways.get(endpoint.engineType()).job(endpoint,instance.getEngineJobId());
  if (isTerminal(snapshot.status())) { JobInstance update=new JobInstance(); update.setId(instanceId); update.setJobStatus(toLocal(snapshot.status())); update.setErrorMessage(snapshot.errorMessage()); update.setEndTime(new Date()); instances.updateById(update); }
  return snapshot;
 }
 private boolean isTerminal(EngineJobStatus status){return status==EngineJobStatus.FINISHED||status==EngineJobStatus.FAILED||status==EngineJobStatus.CANCELED;}
 private JobStatus toLocal(EngineJobStatus status){return switch(status){case FINISHED -> JobStatus.FINISHED; case CANCELED -> JobStatus.CANCELED; default -> JobStatus.FAILED;};}
}
