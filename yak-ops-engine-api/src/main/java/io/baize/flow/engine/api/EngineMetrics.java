package io.baize.flow.engine.api;
import java.util.Map;
public record EngineMetrics(Map<String, Number> values) { public EngineMetrics { values = values == null ? Map.of() : Map.copyOf(values); } }
