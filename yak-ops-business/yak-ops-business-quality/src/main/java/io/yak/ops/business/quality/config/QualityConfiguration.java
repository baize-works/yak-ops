package io.yak.ops.business.quality.config;

import io.yak.ops.business.datasource.config.BusinessDatabaseConfiguration;
import io.yak.ops.business.datasource.service.DataSourceCatalogService;
import io.yak.ops.business.quality.execution.QualityMetricEvaluator;
import io.yak.ops.business.quality.execution.QualitySqlCompiler;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration(proxyBeanMethods = false)
@ConditionalOnQualityEnabled
@EnableConfigurationProperties(QualityProperties.class)
@Import(BusinessDatabaseConfiguration.class)
public class QualityConfiguration {

  @Bean(initMethod = "migrate")
  public Flyway qualityFlyway(
      @Qualifier("yakBusinessDataSource") DataSource dataSource) {
    return Flyway.configure()
        .dataSource(dataSource)
        .locations("classpath:db/migration/yak-quality")
        .table("yak_quality_schema_history")
        .baselineVersion(MigrationVersion.fromVersion("0"))
        .baselineOnMigrate(true)
        .load();
  }

  @Bean(name = "qualityJdbcTemplate")
  public NamedParameterJdbcTemplate qualityJdbcTemplate(
      @Qualifier("yakBusinessDataSource") DataSource dataSource) {
    return new NamedParameterJdbcTemplate(dataSource);
  }

  @Bean
  public QualityMetricEvaluator qualityMetricEvaluator() {
    return new QualityMetricEvaluator();
  }

  @Bean
  public QualitySqlCompiler qualitySqlCompiler(
      DataSourceCatalogService catalogService,
      QualityMetricEvaluator evaluator) {
    return new QualitySqlCompiler(catalogService, evaluator);
  }

  @Bean(name = "qualityExecutionTaskExecutor", destroyMethod = "shutdown")
  public ThreadPoolTaskExecutor qualityExecutionTaskExecutor(
      QualityProperties properties) {
    QualityProperties.Executor executor = properties.getExecutor();
    int corePoolSize = Math.max(1, executor.getCorePoolSize());
    int maximumPoolSize = Math.max(corePoolSize, executor.getMaximumPoolSize());
    ThreadPoolTaskExecutor taskExecutor = new ThreadPoolTaskExecutor();
    taskExecutor.setCorePoolSize(corePoolSize);
    taskExecutor.setMaxPoolSize(maximumPoolSize);
    taskExecutor.setQueueCapacity(Math.max(1, executor.getQueueCapacity()));
    taskExecutor.setThreadNamePrefix("yak-quality-");
    taskExecutor.setWaitForTasksToCompleteOnShutdown(true);
    taskExecutor.setAwaitTerminationSeconds(
        Math.max(1, executor.getShutdownWaitSeconds()));
    taskExecutor.initialize();
    return taskExecutor;
  }
}
