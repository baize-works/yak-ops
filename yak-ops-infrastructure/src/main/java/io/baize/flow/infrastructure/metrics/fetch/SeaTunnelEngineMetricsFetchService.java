package io.baize.flow.infrastructure.metrics.fetch;

import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import io.baize.flow.engine.legacy.LegacyRuntimeRestClient;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Map;

@Service
@Slf4j
@SuppressWarnings("unchecked")
public class SeaTunnelEngineMetricsFetchService implements EngineMetricsFetchService {

    @Resource
    private LegacyRuntimeRestClient engineRestClient;

    @Override
    public EngineJobInfo fetchJobInfo(Long clientId, String engineJobId) {
        if (clientId == null || clientId <= 0) {
            throw new IllegalArgumentException("clientId must be positive");
        }
        if (engineJobId == null ) {
            throw new IllegalArgumentException("engineJobId must be positive");
        }

        Map<String, Object> jobInfo = engineRestClient.jobInfo(clientId, engineJobId);
        if (jobInfo == null) {
            jobInfo = Collections.emptyMap();
        }

        Object metricsObj = jobInfo.get("metrics");
        Map<String, Object> metrics = metricsObj instanceof Map
                ? (Map<String, Object>) metricsObj
                : Collections.emptyMap();

        EngineJobInfo result = new EngineJobInfo();
        result.setClientId(clientId);
        result.setEngineJobId(engineJobId);
        result.setJobName(asString(jobInfo.get("jobName")));
        result.setJobStatus(asString(jobInfo.get("jobStatus")));
        result.setRawJobInfo(jobInfo);
        result.setRawMetrics(metrics);

        return result;
    }

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}