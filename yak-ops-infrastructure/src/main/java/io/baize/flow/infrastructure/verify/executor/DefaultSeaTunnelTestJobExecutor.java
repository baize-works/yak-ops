package io.baize.flow.infrastructure.verify.executor;

import io.baize.flow.infrastructure.verify.job.ConnectivityTestJob;
import io.baize.flow.dao.entity.SeaTunnelClient;
import io.baize.flow.domain.enums.JobStatus;
import io.baize.flow.engine.api.EngineEndpoint;
import io.baize.flow.engine.api.EngineGateway;
import io.baize.flow.engine.api.EngineGatewayRegistry;
import io.baize.flow.engine.api.EngineJobStatus;
import io.baize.flow.engine.api.EngineSubmitCommand;
import org.springframework.stereotype.Component;

/** Connectivity executor expressed solely through the engine-neutral gateway. */
@Component
public class DefaultSeaTunnelTestJobExecutor implements SeaTunnelTestJobExecutor {
 private final EngineGatewayRegistry gateways;
 public DefaultSeaTunnelTestJobExecutor(EngineGatewayRegistry gateways) { this.gateways = gateways; }
 @Override public JobExecutionResult executeAndWait(SeaTunnelClient client, ConnectivityTestJob job, long timeoutMs, long pollIntervalMs) {
  long started=System.currentTimeMillis(); JobExecutionResult result=new JobExecutionResult(); String jobId=null;
  try {
   EngineEndpoint endpoint=EngineEndpoint.seatunnel(client.getId()); EngineGateway gateway=gateways.get(endpoint.engineType());
   jobId=gateway.submit(endpoint,new EngineSubmitCommand(job.getJobConfig(), job.getJobName()+".conf", job.getJobName())).jobId(); result.setJobId(jobId);
   long deadline=started+timeoutMs; EngineJobStatus status=EngineJobStatus.UNKNOWN;
   while(System.currentTimeMillis()<deadline) { status=gateway.job(endpoint,jobId).status(); if(isTerminal(status)) break; Thread.sleep(pollIntervalMs); }
   result.setFinalStatus(status == EngineJobStatus.UNKNOWN ? "TIMEOUT" : status.name());
   result.setSuccess(status == EngineJobStatus.FINISHED);
   if(!result.isSuccess()) result.setErrorMessage(status == EngineJobStatus.UNKNOWN ? "The test job did not finish within the timeout" : "Test job ended with " + status);
   if(job.isCleanupRequired() && !isTerminal(status)) gateway.stop(endpoint,jobId);
  } catch(Exception e) { result.setSuccess(false); result.setErrorMessage(e.getMessage()==null?e.getClass().getSimpleName():e.getMessage()); }
  result.setDurationMs(System.currentTimeMillis()-started); return result;
 }
 private boolean isTerminal(EngineJobStatus status) { return status==EngineJobStatus.FINISHED||status==EngineJobStatus.FAILED||status==EngineJobStatus.CANCELED; }
}
