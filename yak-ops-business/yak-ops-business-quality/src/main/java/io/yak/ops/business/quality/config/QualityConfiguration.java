package io.yak.ops.business.quality.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import io.yak.ops.business.quality.repository.QualityRuleRepository;
import io.yak.ops.business.quality.service.QualityRuleService;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.PlatformTransactionManager;

@ConditionalOnQualityEnabled
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(QualityProperties.class)
public class QualityConfiguration {

  @Bean(name = "qualityDataSource", destroyMethod = "close")
  public HikariDataSource qualityDataSource(QualityProperties properties) {
    QualityProperties.Datasource datasource = properties.getDatasource();
    HikariConfig config = new HikariConfig();
    config.setPoolName("YakQualityPool");
    config.setJdbcUrl(datasource.getUrl());
    config.setUsername(datasource.getUsername());
    config.setPassword(datasource.getPassword());
    config.setDriverClassName(datasource.getDriverClassName());
    config.setMaximumPoolSize(datasource.getMaximumPoolSize());
    config.setMinimumIdle(datasource.getMinimumIdle());
    config.setAutoCommit(true);
    return new HikariDataSource(config);
  }

  @Bean(name = "qualityTransactionManager")
  public PlatformTransactionManager qualityTransactionManager(
      @Qualifier("qualityDataSource") DataSource dataSource) {
    return new DataSourceTransactionManager(dataSource);
  }

  @Bean(name = "qualityJdbcTemplate")
  public NamedParameterJdbcTemplate qualityJdbcTemplate(
      @Qualifier("qualityDataSource") DataSource dataSource) {
    return new NamedParameterJdbcTemplate(dataSource);
  }

  @Bean(initMethod = "migrate")
  public Flyway qualityFlyway(@Qualifier("qualityDataSource") DataSource dataSource) {
    return Flyway.configure()
        .dataSource(dataSource)
        .locations("classpath:db/migration/yak-quality")
        .table("yak_quality_schema_history")
        .baselineVersion(MigrationVersion.fromVersion("0"))
        .baselineOnMigrate(true)
        .load();
  }

  @Bean
  public QualityRuleRepository qualityRuleRepository(
      @Qualifier("qualityJdbcTemplate") NamedParameterJdbcTemplate jdbcTemplate) {
    return new QualityRuleRepository(jdbcTemplate);
  }

  @Bean
  public QualityRuleService qualityRuleService(QualityRuleRepository repository) {
    return new QualityRuleService(repository);
  }
}
