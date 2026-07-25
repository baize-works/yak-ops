package io.baize.flow.engine.seatunnel;

import static org.junit.jupiter.api.Assertions.*;

import io.baize.flow.engine.api.*;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class SeaTunnelEngineGatewayTest {
    private static final EngineEndpoint ENDPOINT = new EngineEndpoint(new ExecutionEngine("seatunnel"), "1", null, null, java.util.Map.of());

    @Test void maps_submit_job_status_and_metrics_without_exposing_vendor_types() {
        SeaTunnelEngineGateway gateway = gateway(new SeaTunnelEngineClient() {
            public SeaTunnelSubmitResponse submit(long id, byte[] c, String f) { return new SeaTunnelSubmitResponse("42"); }
            public SeaTunnelJobResponse job(long id, String job) { return new SeaTunnelJobResponse("CANCELLED", "none", List.of(Map.of("pipelineId", 1, "name", "p", "status", "RUNNING")), List.of(Map.of("taskId", 2, "name", "t", "status", "FAILED", "errorMessage", "bad"))); }
            public SeaTunnelMetricsResponse metrics(long id, String job) { return new SeaTunnelMetricsResponse(Map.of("records", 9, "ignored", "text")); }
            public void cancel(long id, String job) { }
            public void probe(long id) { }
        });
        assertEquals("42", gateway.submit(ENDPOINT, new EngineSubmitCommand("env {}", null, null)).jobId());
        EngineJobSnapshot job = gateway.job(ENDPOINT, "42");
        assertEquals(EngineJobStatus.CANCELED, job.status()); assertEquals(EngineJobStatus.RUNNING, job.pipelines().getFirst().status()); assertEquals(EngineJobStatus.FAILED, job.tasks().getFirst().status());
        assertEquals(9, gateway.metrics(ENDPOINT, "42").values().get("records"));
    }

    @Test void rejects_missing_job_id_and_invalid_responses() {
        SeaTunnelEngineGateway gateway = gateway(new Stub() { @Override public SeaTunnelSubmitResponse submit(long id, byte[] c, String f) { return new SeaTunnelSubmitResponse(" "); } });
        assertEquals(EngineException.Code.RESPONSE_INVALID, assertThrows(EngineException.class, () -> gateway.submit(ENDPOINT, new EngineSubmitCommand("x", null, null))).code());
        SeaTunnelEngineGateway invalidJob = gateway(new Stub() { @Override public SeaTunnelJobResponse job(long id, String job) { return null; } });
        assertEquals(EngineException.Code.RESPONSE_INVALID, assertThrows(EngineException.class, () -> invalidJob.job(ENDPOINT, "1")).code());
    }

    @Test void maps_cancellation_and_transport_failures() {
        SeaTunnelEngineGateway gateway = gateway(new Stub() { @Override public void cancel(long id, String job) { throw new IllegalStateException("connection refused"); } });
        EngineException error = assertThrows(EngineException.class, () -> gateway.stop(ENDPOINT, "1"));
        assertEquals(EngineException.Code.TRANSPORT_FAILURE, error.code());
        assertEquals(EngineJobStatus.CANCELED, SeaTunnelJobStatusMapper.map("CANCELED"));
    }

    private static SeaTunnelEngineGateway gateway(SeaTunnelEngineClient client) { return new SeaTunnelEngineGateway(client); }
    private abstract static class Stub implements SeaTunnelEngineClient {
        public SeaTunnelSubmitResponse submit(long id, byte[] c, String f) { return new SeaTunnelSubmitResponse("1"); }
        public SeaTunnelJobResponse job(long id, String job) { return new SeaTunnelJobResponse("RUNNING", null, List.of(), List.of()); }
        public SeaTunnelMetricsResponse metrics(long id, String job) { return new SeaTunnelMetricsResponse(Map.of()); }
        public void cancel(long id, String job) { }
        public void probe(long id) { }
    }
}
