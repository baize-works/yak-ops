package io.yak.ops.boot;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.yak.framework.security.permission.PermissionDefinition;
import io.yak.framework.security.permission.PermissionDefinitionProvider;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(classes = YakOpsApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
class YakOpsApplicationTests {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private PermissionDefinitionProvider permissionDefinitionProvider;

  @Test
  void testControllerShouldReturnFrameworkResult() throws Exception {
    mockMvc.perform(get("/api/test/ping"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.application").value("yak-ops"))
        .andExpect(jsonPath("$.data.status").value("UP"))
        .andExpect(jsonPath("$.data.framework").value("yak-framework"));
  }

  @Test
  void yakOpsOpenApiGroupShouldContainTestEndpoint() throws Exception {
    mockMvc.perform(get("/v3/api-docs/yak-ops"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.paths['/api/test/ping']").exists());
  }

  @Test
  void shouldDeclareFrontendNavigationPermissionContract() {
    List<PermissionDefinition> definitions =
        permissionDefinitionProvider.getPermissionDefinitions();

    assertThat(definitions)
        .extracting(PermissionDefinition::getCode)
        .containsExactly(
            "security",
            "task",
            "datasource",
            "job",
            "workflow",
            "resource",
            "quality",
            "operations",
            "knowledge");

    List<String> permissionCodes = definitions.stream()
        .flatMap(definition -> definition.getPermissions().stream())
        .map(PermissionDefinition.Item::getCode)
        .toList();

    assertThat(permissionCodes).contains(
        "security:root",
        "task:batch:read",
        "task:batch:create",
        "task:realtime:read",
        "task:realtime:create",
        "workflow:project:read",
        "workflow:definition:read",
        "workflow:definition:create",
        "workflow:instance:read",
        "resource:data-source:read",
        "resource:client:read",
        "resource:connector:read",
        "quality:rule:read",
        "quality:report:read",
        "operations:metrics:read",
        "operations:alarm:read",
        "knowledge:read",
        "security:user:read",
        "security:role:read",
        "security:permission:read",
        "security:department:read",
        "security:project:read",
        "security:resource-permission:read",
        "security:config:read",
        "security:operation-log:read");
  }
}
