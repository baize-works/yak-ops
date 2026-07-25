package io.baize.flow.engine.legacy.internal.vendor;

/** HTTP-facing contract kept private to the SeaTunnel adapter. */
interface SeaTunnelEngineClient {
    SeaTunnelSubmitResponse submit(long clientId, byte[] configuration, String filename);
    SeaTunnelJobResponse job(long clientId, String jobId);
    SeaTunnelMetricsResponse metrics(long clientId, String jobId);
    void cancel(long clientId, String jobId);
    void probe(long clientId);
}
