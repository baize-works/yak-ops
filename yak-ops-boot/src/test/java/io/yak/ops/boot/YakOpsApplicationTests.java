package io.yak.ops.boot;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.yak.framework.security.permission.PermissionDefinitionProvider;
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
  void shouldDeclarePermissionsBeforeSecurityBootstrap() {
    assertThat(permissionDefinitionProvider.getPermissionDefinitions())
        .extracting("code")
        .containsExactly("datasource", "job", "workflow", "quality", "resource");
  }
}
