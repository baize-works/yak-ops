package io.baize.flow.infrastructure.metrics.fetch;

import java.util.Map;

public interface EngineMetricsFetchService {

    EngineJobInfo fetchJobInfo(Long clientId, String engineJobId);
}
