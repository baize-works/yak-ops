package io.yak.ops.engine.api;

import java.util.Map;

/** Port used by the application to obtain raw job runtime information. */
public interface EngineRuntimeClientPort {
    Map<String, Object> jobInfo(Long clientId, String jobEngineId);
}
