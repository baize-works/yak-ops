package io.yak.ops.business.datasource.common.enums;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class DataSourceDbTypeTest {

  @Test
  void shouldSupportPostgresAliases() {
    assertThat(DataSourceDbType.parse("postgresql"))
        .isEqualTo(DataSourceDbType.POSTGRE_SQL);
    assertThat(DataSourceDbType.parse("POSTGRES"))
        .isEqualTo(DataSourceDbType.POSTGRE_SQL);
  }

  @Test
  void shouldExposeDefaultDriverAndPort() {
    assertThat(DataSourceDbType.MYSQL.getDefaultDriverClassName())
        .isEqualTo("org.mariadb.jdbc.Driver");
    assertThat(DataSourceDbType.DORIS.getDefaultPort())
        .isEqualTo(9030);
  }
}
