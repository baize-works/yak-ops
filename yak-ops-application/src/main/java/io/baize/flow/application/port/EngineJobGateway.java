package io.baize.flow.application.port;

import io.baize.flow.engine.api.EngineEndpoint;
import io.baize.flow.engine.api.EngineJobSnapshot;
import io.baize.flow.engine.api.EngineMetrics;

/** Application port for engine job queries. */
public interface EngineJobGateway { EngineJobSnapshot job(EngineEndpoint endpoint, String jobId); EngineMetrics metrics(EngineEndpoint endpoint, String jobId); }
