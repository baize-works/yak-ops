package io.yak.ops.business.sync.offline.form;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ConnectorPresentationRegistryTest {

  private final ConnectorPresentationRegistry registry = new ConnectorPresentationRegistry();

  @Test
  void shouldProvideJdbcCatalogInteractions() {
    ConnectorPresentationProfile source = registry.find("jdbc", "SOURCE");
    ConnectorPresentationProfile sink = registry.find("JDBC", "sink");

    assertThat(source).isNotNull();
    assertThat(sink).isNotNull();
    assertThat(source.getProfileVersion()).isEqualTo("2");
    assertThat(source.getFields().get("table_path").getOptionSource().getAction())
        .isEqualTo("LIST_TABLES");
    assertThat(source.getFields().get("partition_column").getDependsOn())
        .containsExactly("table_path", "query");
    assertThat(sink.getFields().get("primary_keys").getOptionSource().isMultiple()).isTrue();
    assertThat(source.getFields().get("password").getValueSource()).isEqualTo("DATASOURCE");
  }

  @Test
  void shouldReturnNullForUnknownConnector() {
    assertThat(registry.find("http", "SOURCE")).isNull();
  }
}
