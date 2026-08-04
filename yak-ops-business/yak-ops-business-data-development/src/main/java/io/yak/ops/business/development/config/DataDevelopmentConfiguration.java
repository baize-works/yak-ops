package io.yak.ops.business.development.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import io.yak.ops.business.development.repository.DataDevelopmentExecutionRepository;
import io.yak.ops.business.development.repository.DataDevelopmentRepository;
import io.yak.ops.business.development.service.DataDevelopmentJsonCodec;
import io.yak.ops.core.workflow.WorkflowTaskExecutorRegistry;
import io.yak.ops.plugin.task.api.TaskPluginCatalog;
import java.util.List;
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

/** Data-development datasource, Flyway, plugin catalog and execution runtime assembly. */
@ConditionalOnDataDevelopmentEnabled
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(DataDevelopmentProperties.class)
public class DataDevelopmentConfiguration {

  @Bean(name = "dataDevelopmentDataSource", destroyMethod = "close")
  public HikariDataSource dataDevelopmentDataSource(DataDevelopmentProperties properties) {
    DataDevelopmentProperties.Datasource datasource = properties.getDatasource();
    HikariConfig config = new HikariConfig();
    config.setPoolName("YakDataDevelopmentPool");
    config.setJdbcUrl(datasource.getUrl());
    config.setUsername(datasource.getUsername());
    config.setPassword(datasource.getPassword());
    config.setDriverClassName(datasource.getDriverClassName());
    config.setMaximumPoolSize(datasource.getMaximumPoolSize());
    config.setMinimumIdle(datasource.getMinimumIdle());
    config.setAutoCommit(true);
    return new HikariDataSource(config);
  }

  @Bean(name = "dataDevelopmentTransactionManager")
  public PlatformTransactionManager dataDevelopmentTransactionManager(
      @Qualifier("dataDevelopmentDataSource") DataSource dataSource) {
    return new DataSourceTransactionManager(dataSource);
  }

  @Bean(name = "dataDevelopmentJdbcTemplate")
  public NamedParameterJdbcTemplate dataDevelopmentJdbcTemplate(
      @Qualifier("dataDevelopmentDataSource") DataSource dataSource) {
    return new NamedParameterJdbcTemplate(dataSource);
  }

  @Bean(initMethod = "migrate")
  public Flyway dataDevelopmentFlyway(
      @Qualifier("dataDevelopmentDataSource") DataSource dataSource) {
    return Flyway.configure()
        .dataSource(dataSource)
        .locations("classpath:db/migration/yak-data-development")
        .table("yak_dev_schema_history")
        .baselineVersion(MigrationVersion.fromVersion("0"))
        .baselineOnMigrate(true)
        .load();
  }

  @Bean
  public TaskPluginCatalog dataDevelopmentTaskPluginCatalog() {
    return new TaskPluginCatalog();
  }

  @Bean(name = "dataDevelopmentTaskExecutorRegistry")
  public WorkflowTaskExecutorRegistry dataDevelopmentTaskExecutorRegistry() {
    return new WorkflowTaskExecutorRegistry(List.of());
  }

  @Bean
  public DataDevelopmentJsonCodec dataDevelopmentJsonCodec() {
    return new DataDevelopmentJsonCodec();
  }

  @Bean
  public DataDevelopmentRepository dataDevelopmentRepository(
      @Qualifier("dataDevelopmentJdbcTemplate") NamedParameterJdbcTemplate jdbcTemplate,
      DataDevelopmentJsonCodec jsonCodec) {
    return new DataDevelopmentRepository(jdbcTemplate, jsonCodec);
  }

  @Bean
  public DataDevelopmentExecutionRepository dataDevelopmentExecutionRepository(
      @Qualifier("dataDevelopmentJdbcTemplate") NamedParameterJdbcTemplate jdbcTemplate,
      DataDevelopmentJsonCodec jsonCodec) {
    return new DataDevelopmentExecutionRepository(jdbcTemplate, jsonCodec);
  }
}
