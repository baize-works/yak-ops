package io.yak.ops.boot;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(classes = YakOpsApplication.class)
@AutoConfigureMockMvc
class YakOpsApplicationTests {

  @Autowired
  private MockMvc mockMvc;

  @Test
  void testControllerShouldReturnFrameworkResult() throws Exception {
    mockMvc.perform(get("/api/test/ping"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.application").value("yak-ops"))
        .andExpect(jsonPath("$.data.status").value("UP"))
        .andExpect(jsonPath("$.data.framework").value("yak-framework"));
  }
}
