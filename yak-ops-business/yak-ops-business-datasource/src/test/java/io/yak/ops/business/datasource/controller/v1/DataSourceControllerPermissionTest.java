package io.yak.ops.business.datasource.controller.v1;

import static org.assertj.core.api.Assertions.assertThat;

import io.yak.framework.security.web.RequiresPermission;
import io.yak.ops.common.constant.datasource.DataSourcePermissionCode;
import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;

class DataSourceControllerPermissionTest {

  @Test
  void shouldRequireReadPermissionForDatasourceControllers() {
    assertPermission(DataSourceController.class, DataSourcePermissionCode.READ);
    assertPermission(DataSourceCatalogController.class, DataSourcePermissionCode.READ);
    assertPermission(DataSourcePluginConfigController.class, DataSourcePermissionCode.READ);
  }

  @Test
  void shouldRequireActionPermissionsForMutatingEndpoints() throws Exception {
    assertPermission(
        DataSourceController.class.getMethod("create", io.yak.ops.common.bean.dto.datasource.DataSourceDTO.class),
        DataSourcePermissionCode.CREATE);
    assertPermission(
        DataSourceController.class.getMethod(
            "update", Long.class, io.yak.ops.common.bean.dto.datasource.DataSourceDTO.class),
        DataSourcePermissionCode.UPDATE);
    assertPermission(
        DataSourceController.class.getMethod("delete", Long.class),
        DataSourcePermissionCode.DELETE);
    assertPermission(
        DataSourceController.class.getMethod("testConnection", Long.class),
        DataSourcePermissionCode.TEST);
  }

  private void assertPermission(Class<?> controllerType, String expected) {
    RequiresPermission permission = controllerType.getAnnotation(RequiresPermission.class);
    assertThat(permission).isNotNull();
    assertThat(permission.value()).isEqualTo(expected);
  }

  private void assertPermission(Method method, String expected) {
    RequiresPermission permission = method.getAnnotation(RequiresPermission.class);
    assertThat(permission).isNotNull();
    assertThat(permission.value()).isEqualTo(expected);
  }
}
