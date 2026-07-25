package io.baize.flow.engine.legacy.internal.vendor;

import io.baize.flow.engine.api.EngineMetrics;
import java.util.LinkedHashMap;
import java.util.Map;

final class SeaTunnelMetricsMapper {
    private SeaTunnelMetricsMapper() { }
    static EngineMetrics map(Map<?, ?> source) {
        Map<String, Number> values = new LinkedHashMap<>();
        if (source != null) for (Map.Entry<?, ?> entry : source.entrySet()) if (entry.getValue() instanceof Number value) values.put(String.valueOf(entry.getKey()), value);
        return new EngineMetrics(values);
    }
}
