package io.yak.ops.engine.legacy.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

/**
 * SeaTunnel Legacy REST 客户端配置。
 */
@Configuration
public class LegacyRestClientConfiguration {

    /**
     * SeaTunnel Legacy REST 请求客户端。
     */
    @Bean("legacyEngineRestTemplate")
    public RestTemplate legacyEngineRestTemplate() {
        SimpleClientHttpRequestFactory requestFactory =
                new SimpleClientHttpRequestFactory();

        // 连接超时时间：15 秒
        requestFactory.setConnectTimeout(15_000);

        // 读取超时时间：60 秒
        requestFactory.setReadTimeout(60_000);

        return new RestTemplate(requestFactory);
    }
}