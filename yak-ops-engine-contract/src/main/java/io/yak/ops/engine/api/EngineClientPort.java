package io.yak.ops.engine.api;

import java.util.List;
import java.util.Map;

/** Application-facing port for legacy-compatible engine management queries. */
public interface EngineClientPort {
    Map<String, Object> overview(String baseUrl, String contextPath,
                                 Map<String, String> tags, EngineClientAuthentication authentication);
    List<Map<String, Object>> systemMonitoringInformation(Long clientId);
    String jobLogs(Long clientId, String engineJobId, String format);
    Map<String, Object> checkpointOverview(Long clientId, Long jobId);
    List<Map<String, Object>> checkpointHistory(Long clientId, Long jobId, Long pipelineId,
                                                Integer limit, String status);
}
