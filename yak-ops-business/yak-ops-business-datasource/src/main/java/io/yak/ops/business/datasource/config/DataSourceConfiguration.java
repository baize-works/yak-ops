package io.yak.ops.business.datasource.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.PlatformTransactionManager;

/** 数据源管理模块基础设施配置。 */
@Configuration(proxyBeanMethods = false)
@ConditionalOnDataSourceEnabled
@EnableConfigurationProperties(DataSourceProperties.class)
public class DataSourceConfiguration {

  @Bean(name = "opsDataSource", destroyMethod = "close")
  public HikariDataSource opsDataSource(DataSourceProperties properties) {
    DataSourceProperties.Database database = properties.getDatabase();
    HikariConfig config = new HikariConfig();
    config.setPoolName("YakOpsDatasourcePool");
    config.setJdbcUrl(database.getUrl());
    config.setUsername(database.getUsername());
    config.setPassword(database.getPassword());
    config.setDriverClassName(database.getDriverClassName());
    config.setMinimumIdle(database.getMinimumIdle());
    config.setMaximumPoolSize(database.getMaximumPoolSize());
    config.setAutoCommit(true);
    return new HikariDataSource(config);
  }

  @Bean(name = "opsDataSourceTransactionManager")
  public PlatformTransactionManager opsDataSourceTransactionManager(
      @Qualifier("opsDataSource") DataSource dataSource) {
    return new DataSourceTransactionManager(dataSource);
  }

  @Bean(initMethod = "migrate")
  public Flyway opsDataSourceFlyway(@Qualifier("opsDataSource") DataSource dataSource) {
    return Flyway.configure()
        .dataSource(dataSource)
        .locations("classpath:db/migration/yak-datasource")
        .table("yak_ds_schema_history")
        .baselineOnMigrate(true)
        .load();
  }

  @Bean(name = "opsDataSourceJdbcTemplate")
  public NamedParameterJdbcTemplate opsDataSourceJdbcTemplate(
      @Qualifier("opsDataSource") DataSource dataSource) {
    return new NamedParameterJdbcTemplate(dataSource);
  }
}
