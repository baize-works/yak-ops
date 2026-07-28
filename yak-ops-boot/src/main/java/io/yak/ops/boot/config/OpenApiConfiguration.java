package io.yak.ops.boot.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI grouping for Yak Ops and the APIs contributed by Yak Framework.
 */
@Configuration(proxyBeanMethods = false)
public class OpenApiConfiguration {

  @Bean
  public OpenAPI yakOpsOpenApi() {
    return new OpenAPI()
        .info(new Info()
            .title("Yak Ops API")
            .description("Yak Ops APIs and integrated Yak Framework capabilities")
            .version("1.0.0"));
  }

  @Bean
  public GroupedOpenApi yakOpsApiGroup() {
    return GroupedOpenApi.builder()
        .group("yak-ops")
        .pathsToMatch("/api/**")
        .build();
  }

  @Bean
  public GroupedOpenApi yakSecurityApiGroup() {
    return GroupedOpenApi.builder()
        .group("yak-security")
        .pathsToMatch("/yak-security/api/**")
        .build();
  }
}
