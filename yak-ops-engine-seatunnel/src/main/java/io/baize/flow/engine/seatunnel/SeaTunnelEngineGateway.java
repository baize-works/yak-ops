package io.baize.flow.engine.seatunnel;

import io.baize.flow.engine.api.*;
import io.baize.flow.engine.seatunnel.rest.SeaTunnelRestClient;
import java.nio.charset.StandardCharsets;
import org.springframework.stereotype.Component;

/** SeaTunnel REST adapter. Maps vendor responses before they leave this module. */
@Component
public class SeaTunnelEngineGateway implements EngineGateway, EngineMetricsGateway {
    private final SeaTunnelEngineClient client;
    private final java.util.concurrent.ConcurrentMap<String, JobExecution> idempotentSubmissions = new java.util.concurrent.ConcurrentHashMap<>();
    public SeaTunnelEngineGateway(SeaTunnelRestClient client) { this(new RestTemplateSeaTunnelEngineClient(client)); }
    SeaTunnelEngineGateway(SeaTunnelEngineClient client) { this.client = client; }
    @Override public ExecutionEngine engine() { return new ExecutionEngine("seatunnel", "Apache SeaTunnel Zeta engine"); }
    @Override public synchronized JobExecution submit(JobSubmitCommand command) {
        String submissionKey = command.endpoint().endpointId() + ":" + command.idempotencyKey();
        JobExecution existing = idempotentSubmissions.get(submissionKey);
        if (existing != null) return existing;
        try {
            String file = command.runtimeParameters().getOrDefault("fileName", "job.conf");
            SeaTunnelSubmitResponse response = client.submit(clientId(command.endpoint()), command.definition().getBytes(StandardCharsets.UTF_8), file);
            if (response == null || response.jobId() == null || response.jobId().isBlank())
                throw new EngineSubmissionException("SeaTunnel submit response does not contain an execution id", java.util.Map.of("vendor", "seatunnel", "vendor.error_code", "INVALID_RESPONSE"));
            java.time.Instant now = java.time.Instant.now();
            JobExecution execution = new JobExecution(command.idempotencyKey(), response.jobId(), JobExecutionStatus.SUBMITTED, now, null, null, now, null, java.util.Map.of());
            JobExecution raced = idempotentSubmissions.putIfAbsent(submissionKey, execution);
            return raced == null ? execution : raced;
        } catch (EngineContractException e) { throw e; } catch (Exception e) { throw SeaTunnelErrorMapper.submission(e); }
    }
    @Override public void cancel(EngineEndpoint endpoint, String jobId) { try { client.cancel(clientId(endpoint), jobId); } catch (Exception e) { throw SeaTunnelErrorMapper.unavailable("cancel", e); } }
    @Override public JobExecution execution(EngineEndpoint endpoint, String platformId, String jobId) {
        try { SeaTunnelJobResponse info = client.job(clientId(endpoint), jobId); if (info == null) throw SeaTunnelErrorMapper.unavailable("query", new IllegalStateException("empty response"));
            java.time.Instant now=java.time.Instant.now(); return new JobExecution(platformId, jobId, SeaTunnelExecutionStatusMapper.map(info.status()), null, null, null, now, info.errorMessage(), java.util.Map.of()); }
        catch (EngineContractException e) { throw e; } catch (Exception e) { throw SeaTunnelErrorMapper.unavailable("query", e); }
    }
    @Override public EngineMetrics metrics(EngineEndpoint endpoint, String jobId) { capabilities().require(EngineCapabilities.Capability.METRICS); try { SeaTunnelMetricsResponse response = client.metrics(clientId(endpoint), jobId); if (response == null) throw SeaTunnelErrorMapper.unavailable("metrics", new IllegalStateException("empty response")); return SeaTunnelMetricsMapper.map(response.values()); } catch (EngineContractException e) { throw e; } catch (Exception e) { throw SeaTunnelErrorMapper.unavailable("metrics", e); } }
    @Override public EngineHealth health(EngineEndpoint endpoint) { try { client.probe(clientId(endpoint)); return new EngineHealth(true, "reachable"); } catch (Exception e) { return new EngineHealth(false, e.getMessage()); } }
    @Override public EngineCapabilities capabilities() { return EngineCapabilities.of(EngineCapabilities.Capability.METRICS, EngineCapabilities.Capability.LOGS, EngineCapabilities.Capability.CHECKPOINT); }
    private long clientId(EngineEndpoint endpoint) { try { return Long.parseLong(endpoint.endpointId()); } catch (RuntimeException e) { throw new IllegalArgumentException("Engine endpoint id must be numeric", e); } }
}
