package io.yak.ops.common.mybatis;

import static org.assertj.core.api.Assertions.assertThat;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.config.GlobalConfig;
import org.apache.ibatis.type.JdbcType;
import org.junit.jupiter.api.Test;

class MybatisPlusFactorySupportTest {

  @Test
  void shouldCreateConsistentMybatisConfiguration() {
    MybatisConfiguration configuration = MybatisPlusFactorySupport.createConfiguration();

    assertThat(configuration.isMapUnderscoreToCamelCase()).isTrue();
    assertThat(configuration.getJdbcTypeForNull()).isEqualTo(JdbcType.NULL);
    assertThat(configuration.isCacheEnabled()).isFalse();
  }

  @Test
  void shouldDisableBannerForEveryFactory() {
    GlobalConfig first = MybatisPlusFactorySupport.createGlobalConfig();
    GlobalConfig second = MybatisPlusFactorySupport.createGlobalConfig();

    assertThat(first.isBanner()).isFalse();
    assertThat(second.isBanner()).isFalse();
    assertThat(first).isNotSameAs(second);
  }
}
