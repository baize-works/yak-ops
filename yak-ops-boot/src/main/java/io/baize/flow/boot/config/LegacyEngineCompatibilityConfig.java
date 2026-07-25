package io.baize.flow.boot.config;

import io.baize.flow.engine.legacy.LegacyEngineProperties;
import io.baize.flow.engine.legacy.internal.vendor.rest.SeaTunnelClientProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

/** Compatibility wiring for the quarantined legacy transport. */
@Configuration
@EnableConfigurationProperties({LegacyEngineProperties.class, SeaTunnelClientProperties.class})
public class LegacyEngineCompatibilityConfig {
    @Bean("legacyEngineRestTemplate")
    public RestTemplate legacyEngineRestTemplate(LegacyEngineProperties current, SeaTunnelClientProperties deprecated) {
        int connectTimeout = deprecated.getConnectTimeoutMs() == null
                ? current.getClient().getConnectTimeoutMs() : deprecated.getConnectTimeoutMs();
        int readTimeout = deprecated.getReadTimeoutMs() == null
                ? current.getClient().getReadTimeoutMs() : deprecated.getReadTimeoutMs();
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeout);
        factory.setReadTimeout(readTimeout);
        return new RestTemplate(factory);
    }
}
