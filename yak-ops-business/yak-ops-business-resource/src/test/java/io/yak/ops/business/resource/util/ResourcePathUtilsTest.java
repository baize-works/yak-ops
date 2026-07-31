package io.yak.ops.business.resource.util;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.yak.ops.business.resource.exception.ResourceException;
import org.junit.jupiter.api.Test;

class ResourcePathUtilsTest {

  @Test
  void buildsSafeLogicalAndStoragePaths() {
    assertThat(ResourcePathUtils.childPath("/", "demo.sql")).isEqualTo("/demo.sql");
    assertThat(ResourcePathUtils.childPath("/jobs", "demo.sql"))
        .isEqualTo("/jobs/demo.sql");
    assertThat(ResourcePathUtils.storagePath("/jobs/demo.sql"))
        .isEqualTo("jobs/demo.sql");
    assertThat(ResourcePathUtils.suffix("demo.SQL")).isEqualTo("sql");
  }

  @Test
  void rejectsTraversalAndPathSeparatorsInNames() {
    assertThatThrownBy(() -> ResourcePathUtils.normalizeName(".."))
        .isInstanceOf(ResourceException.class);
    assertThatThrownBy(() -> ResourcePathUtils.normalizeName("a/b"))
        .isInstanceOf(ResourceException.class);
    assertThatThrownBy(() -> ResourcePathUtils.normalizeName("a\\b"))
        .isInstanceOf(ResourceException.class);
  }
}
