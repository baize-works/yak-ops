package io.yak.ops.engine.api;
import java.util.Map;
public final class EngineMetrics {

    private final Map<String, Number> values;

    public EngineMetrics(Map<String, Number> values) {
        values = values == null ? java.util.Collections.emptyMap() : java.util.Collections.unmodifiableMap(new java.util.LinkedHashMap<>(values));
        this.values = values;
    }

    public Map<String, Number> values() { return values; }


    public Map<String, Number> getValues() { return values; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        EngineMetrics that = (EngineMetrics) o;
        return java.util.Objects.equals(values, that.values);
    }

    @Override
    public int hashCode() { return java.util.Objects.hash(values); }

    @Override
    public String toString() {
        return "EngineMetrics[" + "values=" + values + "]";
    }
}
