package io.yak.ops.engine.api;
import java.time.Instant;
import java.util.List;
/** Optional log sub-port. */
public interface EngineLogGateway { List<EngineLogEntry> logs(EngineEndpoint endpoint, String externalExecutionId, Instant since); }
