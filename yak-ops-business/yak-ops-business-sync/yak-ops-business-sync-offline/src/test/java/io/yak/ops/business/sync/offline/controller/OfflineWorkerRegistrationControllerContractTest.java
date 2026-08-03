package io.yak.ops.business.sync.offline.controller;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.servlet.http.HttpServletRequest;
import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;

class OfflineWorkerRegistrationControllerContractTest {

  @Test
  void exposesRegisterHeartbeatAndDeregisterRoutes() throws Exception {
    RequestMapping root = OfflineWorkerRegistrationController.class
        .getAnnotation(RequestMapping.class);
    assertThat(root.value()).containsExactly("/api/v1/offline/worker-registration");

    assertPost("register", "/register");
    assertPost("heartbeat", "/heartbeat");
    assertPost("deregister", "/deregister");
  }

  private void assertPost(String methodName, String path) throws Exception {
    Method method = OfflineWorkerRegistrationController.class.getMethod(
        methodName,
        HttpServletRequest.class,
        String.class);
    assertThat(method.getAnnotation(PostMapping.class).value()).containsExactly(path);
  }
}
