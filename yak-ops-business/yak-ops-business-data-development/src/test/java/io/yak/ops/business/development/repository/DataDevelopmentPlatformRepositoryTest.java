package io.yak.ops.business.development.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Modifier;
import org.junit.jupiter.api.Test;

class DataDevelopmentPlatformRepositoryTest {

  @Test
  void shouldRemainProxyableBySpring() {
    assertThat(Modifier.isFinal(DataDevelopmentPlatformRepository.class.getModifiers()))
        .as("Spring CGLIB proxying requires repository classes to be non-final")
        .isFalse();
  }
}
