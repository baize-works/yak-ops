package io.yak.ops.plugin.database.jdbc.mysql;

import static org.assertj.core.api.Assertions.assertThat;

import io.yak.ops.spi.datasource.DataSourceConnection;
import io.yak.ops.spi.datasource.DataSourcePlugin;
import java.util.HashSet;
import java.util.ServiceLoader;
import java.util.Set;
import org.junit.jupiter.api.Test;

class MySqlDataSourcePluginTest {

  @Test
  void shouldParseAndNormalizeConnectionParametersInsidePlugin() {
    DataSourceConnection connection =
        new MySqlDataSourcePlugin()
            .parseConnection(
                "{\"pluginType\":\"MYSQL\",\"host\":\"127.0.0.1\","
                    + "\"database\":\"demo\",\"username\":\"root\","
                    + "\"password\":\"secret\",\"properties\":{\"useSSL\":\"false\"}}");

    assertThat(connection.jdbcUrl()).isEqualTo("jdbc:mariadb://127.0.0.1:3306/demo");
    assertThat(connection.driverClassName()).isEqualTo("org.mariadb.jdbc.Driver");
    assertThat(connection.properties()).containsEntry("useSSL", "false");
    assertThat(connection.normalizedJson()).contains("\"dbType\":\"MYSQL\"");
  }

  @Test
  void shouldDiscoverJdbcPluginsThroughServiceLoader() {
    Set<String> types = new HashSet<>();
    for (DataSourcePlugin plugin : ServiceLoader.load(DataSourcePlugin.class)) {
      types.add(plugin.dbType().name());
    }

    assertThat(types)
        .contains("MYSQL", "POSTGRE_SQL", "ORACLE", "KINGBASE", "DAMENG");
  }
}
