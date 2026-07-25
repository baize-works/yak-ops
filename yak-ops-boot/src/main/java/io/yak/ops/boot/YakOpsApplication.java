package io.yak.ops.boot;

import io.yak.ops.dao.DaoConfiguration;
import org.apache.seatunnel.plugin.datasource.api.plugin.DataSourceProcessorProvider;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@ComponentScan(basePackages = {
        "io.yak.ops.application",
        "io.yak.ops.api",
        "io.yak.ops.application",
        "io.yak.ops.infrastructure",
        "io.yak.ops.dao",
        "io.yak.ops.engine",
        "org.apache.seatunnel.plugin.datasource.api"
})
@Import(DaoConfiguration.class)
@EnableConfigurationProperties
@EnableAsync(proxyTargetClass = true)
public class YakOpsApplication {

    public static void main(String[] args) {
        SpringApplication.run(YakOpsApplication.class, args);
    }

    @Bean
    public ApplicationRunner dataSourceProcessorInitializer() {
        return args -> DataSourceProcessorProvider.initialize();
    }
}
