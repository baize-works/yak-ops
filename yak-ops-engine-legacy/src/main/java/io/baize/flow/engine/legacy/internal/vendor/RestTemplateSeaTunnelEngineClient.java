package io.baize.flow.engine.legacy.internal.vendor;

import io.baize.flow.engine.legacy.LegacyRestClient;
import java.util.List;
import java.util.Map;

/** Converts the legacy REST client's untyped payloads at the adapter boundary. */
final class RestTemplateSeaTunnelEngineClient implements SeaTunnelEngineClient {
    private final LegacyRestClient client;
    RestTemplateSeaTunnelEngineClient(LegacyRestClient client) { this.client = client; }
    @Override public SeaTunnelSubmitResponse submit(long id, byte[] config, String filename) {
        Map<?, ?> value = client.submitJobUpload(id, config, filename);
        return value == null ? null : new SeaTunnelSubmitResponse(string(value.get("jobId")));
    }
    @Override public SeaTunnelJobResponse job(long id, String jobId) {
        Map<?, ?> value = client.jobInfo(id, jobId);
        return value == null ? null : new SeaTunnelJobResponse(string(value.get("status")), string(value.get("errorMessage")), maps(value.get("pipelines")), maps(value.get("tasks")));
    }
    @Override public SeaTunnelMetricsResponse metrics(long id, String jobId) { return new SeaTunnelMetricsResponse(client.jobInfo(id, jobId)); }
    @Override public void cancel(long id, String jobId) { client.stopJob(id, jobId, false); }
    @Override public void probe(long id) { client.runningJobs(id); }
    private static String string(Object value) { return value == null ? null : value.toString(); }
    private static List<Map<?, ?>> maps(Object value) { if (!(value instanceof List<?>)) return java.util.Collections.emptyList(); List<?> list = (List<?>) value; return list.stream().filter(Map.class::isInstance).map(Map.class::cast).collect(java.util.stream.Collectors.toList()); }
}
