package io.yak.ops.business.sync.offline.controller;

import static org.assertj.core.api.Assertions.assertThat;

import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.CreateRequest;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.LeaseRevokeRequest;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.QueryRequest;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.SchedulingRequest;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.UpdateRequest;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerModels.VerifyRequest;
import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;

class OfflineWorkerControllerContractTest {

  @Test
  void exposesWorkerManagementCapabilityAndLeaseClosure() throws Exception {
    RequestMapping root = OfflineWorkerController.class.getAnnotation(RequestMapping.class);
    assertThat(root.value()).containsExactly("/api/v1/offline/workers");

    assertPost("verify", new Class<?>[] {VerifyRequest.class}, "/verify");
    assertPost("create", new Class<?>[] {CreateRequest.class}, null);
    assertPut("update", new Class<?>[] {String.class, UpdateRequest.class}, "/{nodeId}");
    assertGet("detail", new Class<?>[] {String.class}, "/{nodeId}");
    assertPost("page", new Class<?>[] {QueryRequest.class}, "/page");
    assertGet("options", new Class<?>[0], "/options");
    assertPost("refresh", new Class<?>[] {String.class}, "/{nodeId}/refresh");
    assertGet("capabilities", new Class<?>[] {String.class}, "/{nodeId}/capabilities");
    assertPost(
        "refreshCapabilities",
        new Class<?>[] {String.class},
        "/{nodeId}/capabilities/refresh");
    assertPost(
        "revokeLease",
        new Class<?>[] {String.class, LeaseRevokeRequest.class},
        "/{nodeId}/lease/revoke");
    assertPut(
        "schedulingStatus",
        new Class<?>[] {String.class, SchedulingRequest.class},
        "/{nodeId}/scheduling-status");
    assertDelete("delete", new Class<?>[] {String.class}, "/{nodeId}");
  }

  private void assertPost(String name, Class<?>[] parameters, String path) throws Exception {
    Method method = OfflineWorkerController.class.getMethod(name, parameters);
    String[] paths = method.getAnnotation(PostMapping.class).value();
    if (path == null) {
      assertThat(paths).isEmpty();
    } else {
      assertThat(paths).containsExactly(path);
    }
  }

  private void assertPut(String name, Class<?>[] parameters, String path) throws Exception {
    Method method = OfflineWorkerController.class.getMethod(name, parameters);
    assertThat(method.getAnnotation(PutMapping.class).value()).containsExactly(path);
  }

  private void assertGet(String name, Class<?>[] parameters, String path) throws Exception {
    Method method = OfflineWorkerController.class.getMethod(name, parameters);
    assertThat(method.getAnnotation(GetMapping.class).value()).containsExactly(path);
  }

  private void assertDelete(String name, Class<?>[] parameters, String path) throws Exception {
    Method method = OfflineWorkerController.class.getMethod(name, parameters);
    assertThat(method.getAnnotation(DeleteMapping.class).value()).containsExactly(path);
  }
}
