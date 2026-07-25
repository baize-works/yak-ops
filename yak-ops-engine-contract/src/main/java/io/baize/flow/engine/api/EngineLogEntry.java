package io.baize.flow.engine.api;
import java.time.Instant;
public record EngineLogEntry(Instant timestamp, String level, String message) { }
