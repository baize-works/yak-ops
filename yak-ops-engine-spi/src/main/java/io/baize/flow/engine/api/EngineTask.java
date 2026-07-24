package io.baize.flow.engine.api;
public record EngineTask(String id, String name, EngineJobStatus status, String errorMessage) { }
