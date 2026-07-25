package io.baize.flow.infrastructure.verify.job;

import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class TestJobEnvConfigBuilder {

    public Config buildBatchEnv() {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("parallelism", 1);
        map.put("job.mode", "BATCH");
        return ConfigFactory.parseMap(map);
    }
}
