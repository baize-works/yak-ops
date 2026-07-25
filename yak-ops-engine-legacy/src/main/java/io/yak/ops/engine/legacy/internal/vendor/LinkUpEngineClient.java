package io.yak.ops.engine.legacy.internal.vendor;

/** HTTP-facing contract kept private to the LinkUp adapter. */
interface LinkUpEngineClient {
    LinkUpSubmitResponse submit(long clientId, byte[] configuration, String filename);
    LinkUpJobResponse job(long clientId, String jobId);
    LinkUpMetricsResponse metrics(long clientId, String jobId);
    void cancel(long clientId, String jobId);
    void probe(long clientId);
}
