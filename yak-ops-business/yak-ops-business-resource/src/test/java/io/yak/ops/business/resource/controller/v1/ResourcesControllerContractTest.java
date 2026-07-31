package io.yak.ops.business.resource.controller.v1;

import static org.assertj.core.api.Assertions.assertThat;

import io.yak.framework.security.web.RequiresPermission;
import io.yak.ops.common.constant.resource.ResourcePermissionCode;
import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.RequestMapping;

class ResourcesControllerContractTest {

  @Test
  void exposesVersionedResourceApiAndExistingPermissionContract() throws Exception {
    RequestMapping mapping = ResourcesController.class.getAnnotation(RequestMapping.class);
    RequiresPermission read = ResourcesController.class.getAnnotation(RequiresPermission.class);
    Method download = ResourcesController.class.getMethod(
        "download", Long.class, jakarta.servlet.http.HttpServletResponse.class);
    RequiresPermission downloadPermission = download.getAnnotation(RequiresPermission.class);

    assertThat(mapping.value()).containsExactly("/api/v1/resources");
    assertThat(read.value()).isEqualTo(ResourcePermissionCode.READ);
    assertThat(downloadPermission.value()).isEqualTo(ResourcePermissionCode.DOWNLOAD);
  }
}
