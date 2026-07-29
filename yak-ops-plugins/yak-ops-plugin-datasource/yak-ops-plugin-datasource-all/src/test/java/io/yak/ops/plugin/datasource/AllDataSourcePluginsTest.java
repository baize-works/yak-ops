package io.yak.ops.plugin.datasource;

import static org.assertj.core.api.Assertions.assertThat;

import io.yak.ops.common.enums.datasource.DataSourceDbType;
import io.yak.ops.spi.datasource.DataSourcePlugin;
import java.util.EnumSet;
import java.util.ServiceLoader;
import java.util.Set;
import org.junit.jupiter.api.Test;

/** Verifies that the all-plugins artifact exposes every built-in datasource provider. */
class AllDataSourcePluginsTest {

  @Test
  void shouldDiscoverAllBuiltInDatasourcePlugins() {
    Set<DataSourceDbType> discovered = EnumSet.noneOf(DataSourceDbType.class);
    ServiceLoader.load(DataSourcePlugin.class)
        .forEach(plugin -> discovered.add(plugin.dbType()));

    assertThat(discovered)
        .containsExactlyInAnyOrder(
            DataSourceDbType.MYSQL,
            DataSourceDbType.POSTGRE_SQL,
            DataSourceDbType.ORACLE,
            DataSourceDbType.KINGBASE,
            DataSourceDbType.DAMENG,
            DataSourceDbType.DORIS);
  }
}
