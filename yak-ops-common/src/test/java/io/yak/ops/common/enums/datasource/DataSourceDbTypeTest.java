package io.yak.ops.common.enums.datasource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
  void shouldKeepInfrastructureDefaultsOutsideEnum() {
    assertThat(DataSourceDbType.MYSQL.getDisplayName()).isEqualTo("MySQL");
    assertThat(DataSourceDbType.DORIS.getDisplayName()).isEqualTo("Doris");
  }

  @Test
  void shouldRejectUnsupportedTypeWithoutBusinessDependency() {
    assertThatThrownBy(() -> DataSourceDbType.parse("unknown"))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("不支持的数据源类型");
  }
}
