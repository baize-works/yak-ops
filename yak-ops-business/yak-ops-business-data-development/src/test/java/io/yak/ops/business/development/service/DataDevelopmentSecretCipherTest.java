package io.yak.ops.business.development.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.yak.ops.business.development.config.DataDevelopmentProperties;
import org.junit.jupiter.api.Test;

class DataDevelopmentSecretCipherTest {

  @Test
  void encryptsWithRandomIvAndDecrypts() {
    DataDevelopmentProperties properties = new DataDevelopmentProperties();
    properties.getPlatform().setMasterKey("unit-test-master-key");
    DataDevelopmentSecretCipher cipher = new DataDevelopmentSecretCipher(properties);

    String first = cipher.encrypt("secret-value");
    String second = cipher.encrypt("secret-value");

    assertThat(first).startsWith("v1:");
    assertThat(second).isNotEqualTo(first);
    assertThat(cipher.decrypt(first)).isEqualTo("secret-value");
    assertThat(cipher.decrypt(second)).isEqualTo("secret-value");
    assertThat(cipher.digest("secret-value")).hasSize(64);
  }

  @Test
  void refusesSecretOperationsWithoutMasterKey() {
    DataDevelopmentSecretCipher cipher =
        new DataDevelopmentSecretCipher(new DataDevelopmentProperties());

    assertThat(cipher.configured()).isFalse();
    assertThatThrownBy(() -> cipher.encrypt("value"))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("YAK_DATA_DEVELOPMENT_PLATFORM_MASTER_KEY");
  }
}
