package io.yak.ops.engine.legacy.internal.vendor;

import io.yak.ops.engine.api.EngineMetrics;
import java.util.LinkedHashMap;
import java.util.Map;

final class LinkUpMetricsMapper {
    private LinkUpMetricsMapper() { }
    static EngineMetrics map(Map<?, ?> source) {
        Map<String, Number> values = new LinkedHashMap<>();
        if (source != null) for (Map.Entry<?, ?> entry : source.entrySet()) if (entry.getValue() instanceof Number) values.put(String.valueOf(entry.getKey()), (Number) entry.getValue());
        return new EngineMetrics(values);
    }
}
