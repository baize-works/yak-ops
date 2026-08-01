package io.yak.ops.business.sync.offline.form;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ConnectorPresentationRegistryTest {

  private final ConnectorPresentationRegistry registry = new ConnectorPresentationRegistry();

  @Test
  void shouldProvideDifferentJdbcSourceAndSinkProfiles() {
    ConnectorPresentationProfile source = registry.find("jdbc", "SOURCE");
    ConnectorPresentationProfile sink = registry.find("JDBC", "sink");

    assertThat(source).isNotNull();
    assertThat(sink).isNotNull();
    assertThat(source.getFields().get("table_path").getLabel()).isEqualTo("来源表");
    assertThat(sink.getFields().get("table_path").getLabel()).isEqualTo("目标表");
    assertThat(source.getFields().get("password").getValueSource()).isEqualTo("DATASOURCE");
  }

  @Test
  void shouldReturnNullForUnknownConnector() {
    assertThat(registry.find("http", "SOURCE")).isNull();
  }
}
