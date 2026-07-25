package io.baize.flow.boot;

import io.baize.flow.dao.DaoConfiguration;
import org.apache.seatunnel.plugin.datasource.api.plugin.DataSourceProcessorProvider;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Import;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@ComponentScan(basePackages = {
        "io.baize.flow.application",
        "io.baize.flow.api",
        "io.baize.flow.application",
        "io.baize.flow.infrastructure",
        "io.baize.flow.dao",
        "io.baize.flow.engine",
        "org.apache.seatunnel.plugin.datasource.api"
})
@Import(DaoConfiguration.class)
@EnableConfigurationProperties
@EnableAsync(proxyTargetClass = true)
public class BaizeFlowApplication {

    public static void main(String[] args) {
        try {
            SpringApplication sa = new SpringApplication(BaizeFlowApplication.class);
            sa.run(args);
            DataSourceProcessorProvider.initialize();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
