package io.yak.ops.plugin.database.jdbc.mysql;

import static org.assertj.core.api.Assertions.assertThat;

import io.yak.ops.spi.datasource.DataSourceConnection;
import org.junit.jupiter.api.Test;

class MySqlDataSourcePluginTest {

  @Test
  void shouldUseMysqlConnectorJDefaults() {
    DataSourceConnection connection =
        new MySqlDataSourcePlugin()
            .parseConnection(
                "{\"dbType\":\"MYSQL\",\"host\":\"127.0.0.1\","
                    + "\"database\":\"demo\",\"username\":\"root\"}");

    assertThat(connection.jdbcUrl()).isEqualTo("jdbc:mysql://127.0.0.1:3306/demo");
    assertThat(connection.driverClassName()).isEqualTo("com.mysql.cj.jdbc.Driver");
    assertThat(new MySqlDataSourcePlugin().acceptsUrl(connection.jdbcUrl())).isTrue();
    assertThat(new MySqlDataSourcePlugin().acceptsUrl("jdbc:mariadb://127.0.0.1/demo"))
        .isFalse();
  }
}
