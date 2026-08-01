package io.yak.ops.business.sync.offline.engine;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ConnectorIdResolverTest {

  @Test
  void shouldNormalizeDatasourceTypesToJdbc() {
    assertThat(ConnectorIdResolver.resolve(null, "MYSQL", null, null)).isEqualTo("jdbc");
    assertThat(ConnectorIdResolver.resolve(null, null, "POSTGRE_SQL", null)).isEqualTo("jdbc");
    assertThat(ConnectorIdResolver.resolve("Doris", null, null, null)).isEqualTo("jdbc");
    assertThat(ConnectorIdResolver.resolve(null, "Jdbc", null, null)).isEqualTo("jdbc");
  }

  @Test
  void shouldKeepFutureConnectorIdsFrameworkNeutral() {
    assertThat(ConnectorIdResolver.resolve("HTTP", null, null, null)).isEqualTo("http");
    assertThat(ConnectorIdResolver.resolve(null, "file", null, null)).isEqualTo("file");
  }
}
