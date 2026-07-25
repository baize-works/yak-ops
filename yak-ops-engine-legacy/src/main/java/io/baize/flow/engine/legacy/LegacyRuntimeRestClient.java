package io.baize.flow.engine.legacy;

import jakarta.annotation.Resource;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component("legacyEngineRuntimeClient")
@SuppressWarnings({"rawtypes", "unchecked"})
public class LegacyRuntimeRestClient {

    @Resource
    private LegacyRestClient seatunnelRestClient;

    public Map<String, Object> jobInfo(Long clientId, String jobEngineId) {
        if (clientId == null) {
            throw new IllegalArgumentException("clientId must not be null");
        }
        if (jobEngineId == null) {
            throw new IllegalArgumentException("jobEngineId must not be null");
        }
        return seatunnelRestClient.jobInfo(clientId, jobEngineId);
    }
}