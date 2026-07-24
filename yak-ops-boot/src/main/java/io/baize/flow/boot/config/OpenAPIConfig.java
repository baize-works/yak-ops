package io.baize.flow.boot.config;

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
                        .title("SeaTunnel Admin API")
                        .description("SeaTunnel Admin 接口文档")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("SeaTunnel Team")
                                .email("dev@seatunnel.apache.org")
                                .url("https://seatunnel.apache.org"))
                        .license(new License()
                                .name("Apache 2.0")
                                .url("https://www.apache.org/licenses/LICENSE-2.0.html")))
                .servers(List.of(
                        new Server()
                                .url("http://localhost:9527")
                                .description("开发环境"),
                        new Server()
                                .url("https://api.seatunnel.apache.org")
                                .description("生产环境")
                ));
    }
}
