package io.yak.ops.plugin.database.doris;

import static org.assertj.core.api.Assertions.assertThat;

import io.yak.ops.spi.datasource.DataSourceConnection;
import org.junit.jupiter.api.Test;

class DorisDataSourcePluginTest {

  @Test
  void shouldKeepDorisDefaultsInsideDorisPlugin() {
    DataSourceConnection connection =
        new DorisDataSourcePlugin()
            .parseConnection(
                "{\"dbType\":\"DORIS\",\"host\":\"doris-fe\","
                    + "\"database\":\"warehouse\",\"username\":\"root\"}");

    assertThat(connection.jdbcUrl()).isEqualTo("jdbc:mariadb://doris-fe:9030/warehouse");
    assertThat(connection.driverClassName()).isEqualTo("org.mariadb.jdbc.Driver");
    assertThat(new DorisDataSourcePlugin().createCatalog(connection, 5))
        .isInstanceOf(DorisJdbcCatalog.class);
  }
}
