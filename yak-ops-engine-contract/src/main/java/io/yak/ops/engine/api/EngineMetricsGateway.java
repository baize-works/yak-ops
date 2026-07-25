package io.yak.ops.engine.api;
/** Optional metrics sub-port. It deliberately contains no core EngineGateway operations. */
public interface EngineMetricsGateway { EngineMetrics metrics(EngineEndpoint endpoint, String externalExecutionId); }
