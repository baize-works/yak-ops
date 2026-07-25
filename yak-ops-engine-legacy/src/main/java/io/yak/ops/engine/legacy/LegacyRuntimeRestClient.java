package io.yak.ops.engine.legacy;

import io.yak.ops.engine.api.EngineRuntimeClientPort;
import javax.annotation.Resource;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component("legacyEngineRuntimeClient")
@SuppressWarnings({"rawtypes", "unchecked"})
public class LegacyRuntimeRestClient implements EngineRuntimeClientPort {

    @Resource
    private LegacyRestClient linkupRestClient;

    public Map<String, Object> jobInfo(Long clientId, String jobEngineId) {
        if (clientId == null) {
            throw new IllegalArgumentException("clientId must not be null");
        }
        if (jobEngineId == null) {
            throw new IllegalArgumentException("jobEngineId must not be null");
        }
        return linkupRestClient.jobInfo(clientId, jobEngineId);
    }
}
