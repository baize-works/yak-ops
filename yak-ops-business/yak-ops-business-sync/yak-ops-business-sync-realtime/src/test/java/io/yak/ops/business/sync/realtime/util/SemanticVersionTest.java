package io.yak.ops.business.sync.realtime.util;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class SemanticVersionTest {

  @Test
  void comparesDifferentLengthVersions() {
    assertThat(SemanticVersion.parse("1.18"))
        .isEqualByComparingTo(SemanticVersion.parse("1.18.0"));
    assertThat(SemanticVersion.parse("1.19.1"))
        .isGreaterThan(SemanticVersion.parse("1.18.9"));
  }

  @Test
  void validatesCompatibilityRange() {
    assertThat(SemanticVersion.between("1.18.1", "1.17", "1.20")).isTrue();
    assertThat(SemanticVersion.between("1.21", "1.17", "1.20")).isFalse();
    assertThatThrownBy(() -> SemanticVersion.parse("release"))
        .isInstanceOf(IllegalArgumentException.class);
  }
}
