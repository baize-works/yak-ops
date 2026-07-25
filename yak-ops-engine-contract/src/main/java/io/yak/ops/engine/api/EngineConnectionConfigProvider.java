package io.yak.ops.engine.api;

/** Application port through which an adapter obtains a configured engine connection. */
public interface EngineConnectionConfigProvider {
    EngineConnectionConfig connectionFor(EngineEndpoint endpoint);
}
