package io.yak.ops.engine.legacy;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Neutral activation and transport settings for the quarantined legacy adapter. */
@Data
@ConfigurationProperties(prefix = "legacy.engine")
public class LegacyEngineProperties {
    /** The legacy adapter is opt-in while historical workloads are retired. */
    private boolean enabled = false;
    private final Client client = new Client();

    @Data
    public static class Client {
        private int connectTimeoutMs = 2000;
        private int readTimeoutMs = 10000;
    }
}
