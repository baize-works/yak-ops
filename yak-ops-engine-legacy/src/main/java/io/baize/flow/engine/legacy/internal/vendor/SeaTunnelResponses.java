package io.baize.flow.engine.legacy.internal.vendor;

import java.util.List;
import java.util.Map;

/** SeaTunnel wire DTOs; they must not escape this adapter package. */
record SeaTunnelSubmitResponse(String jobId) { }
record SeaTunnelJobResponse(String status, String errorMessage, List<Map<?, ?>> pipelines, List<Map<?, ?>> tasks) { }
record SeaTunnelMetricsResponse(Map<?, ?> values) { }
