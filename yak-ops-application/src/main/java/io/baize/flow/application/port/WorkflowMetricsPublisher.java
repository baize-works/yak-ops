package io.baize.flow.application.port;

import java.util.Map;

/** Output port for publishing live workflow metrics to presentation clients. */
public interface WorkflowMetricsPublisher {
    void publish(String channel, Map<String, Object> message);
}
