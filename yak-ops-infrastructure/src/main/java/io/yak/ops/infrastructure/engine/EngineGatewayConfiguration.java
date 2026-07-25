package io.yak.ops.infrastructure.engine;

import io.yak.ops.engine.api.EngineGateway;
import io.yak.ops.engine.api.EngineGatewayRegistry;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class EngineGatewayConfiguration {
    @Bean
    EngineGatewayRegistry engineGatewayRegistry(List<EngineGateway> gateways) {
        return new EngineGatewayRegistry(gateways);
    }
}
