package io.yak.ops.boot.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenAPIConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("LinkUp Admin API")
                        .description("LinkUp Admin 接口文档")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("LinkUp Team")
                                .email("dev@linkup.apache.org")
                                .url("https://linkup.apache.org"))
                        .license(new License()
                                .name("Apache 2.0")
                                .url("https://www.apache.org/licenses/LICENSE-2.0.html")))
                .servers(java.util.Collections.unmodifiableList(java.util.Arrays.asList(new Server()
                                .url("http://localhost:9527")
                                .description("开发环境"), new Server()
                                .url("https://api.linkup.apache.org")
                                .description("生产环境"))));
    }
}
