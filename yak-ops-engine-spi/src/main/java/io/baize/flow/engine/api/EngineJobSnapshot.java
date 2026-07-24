package io.baize.flow.engine.api;
import java.util.List;
public record EngineJobSnapshot(String jobId, EngineJobStatus status, String errorMessage, List<EnginePipeline> pipelines, List<EngineTask> tasks) { public EngineJobSnapshot { pipelines = pipelines == null ? List.of() : List.copyOf(pipelines); tasks = tasks == null ? List.of() : List.copyOf(tasks); } }
