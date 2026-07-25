package io.yak.ops.engine.api;
import java.util.List;
/** Optional, engine-neutral checkpoint sub-port. */
public interface EngineCheckpointGateway { List<EngineCheckpoint> checkpoints(EngineEndpoint endpoint, String externalExecutionId); }
