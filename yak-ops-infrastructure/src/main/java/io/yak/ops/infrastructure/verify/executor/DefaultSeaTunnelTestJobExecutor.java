package io.yak.ops.infrastructure.verify.executor;

import io.yak.ops.infrastructure.verify.job.ConnectivityTestJob;
import io.yak.ops.dao.entity.SeaTunnelClient;
import io.yak.ops.engine.api.EngineEndpoint;
import io.yak.ops.engine.api.ExecutionEngine;
import io.yak.ops.engine.api.EngineGateway;
import io.yak.ops.engine.api.EngineGatewayRegistry;
import io.yak.ops.engine.api.JobExecutionStatus;
import io.yak.ops.engine.api.JobSubmitCommand;

import org.springframework.stereotype.Component;

/** Connectivity executor expressed solely through the engine-neutral gateway. */
@Component
public class DefaultSeaTunnelTestJobExecutor implements SeaTunnelTestJobExecutor {
 private final EngineGatewayRegistry gateways;
 public DefaultSeaTunnelTestJobExecutor(EngineGatewayRegistry gateways) { this.gateways = gateways; }
 @Override public JobExecutionResult executeAndWait(SeaTunnelClient client, ConnectivityTestJob job, long timeoutMs, long pollIntervalMs) {
  long started=System.currentTimeMillis(); JobExecutionResult result=new JobExecutionResult(); String jobId=null;
  try {
   EngineEndpoint endpoint=new EngineEndpoint(new ExecutionEngine("legacy"), String.valueOf(client.getId()), client.getBaseUrl(), null, java.util.java.util.Collections.emptyMap()); EngineGateway gateway=gateways.get(endpoint.engine());
   jobId=gateway.submit(new JobSubmitCommand(endpoint,job.getJobConfig(),java.util.Collections.singletonMap("fileName", job.getJobName()+".conf"),"connectivity-"+started)).externalExecutionId(); result.setJobId(jobId);
   long deadline=started+timeoutMs; JobExecutionStatus status=JobExecutionStatus.UNKNOWN;
   while(System.currentTimeMillis()<deadline) { status=gateway.execution(endpoint,"connectivity-"+started,jobId).status(); if(isTerminal(status)) break; Thread.sleep(pollIntervalMs); }
   result.setFinalStatus(status == JobExecutionStatus.UNKNOWN ? "TIMEOUT" : status.name());
   result.setSuccess(status == JobExecutionStatus.SUCCEEDED);
   if(!result.isSuccess()) result.setErrorMessage(status == JobExecutionStatus.UNKNOWN ? "The test job did not finish within the timeout" : "Test job ended with " + status);
   if(job.isCleanupRequired() && !isTerminal(status)) gateway.cancel(endpoint,jobId);
  } catch(Exception e) { result.setSuccess(false); result.setErrorMessage(e.getMessage()==null?e.getClass().getSimpleName():e.getMessage()); }
  result.setDurationMs(System.currentTimeMillis()-started); return result;
 }
 private boolean isTerminal(JobExecutionStatus status) { return status.terminal(); }
}
