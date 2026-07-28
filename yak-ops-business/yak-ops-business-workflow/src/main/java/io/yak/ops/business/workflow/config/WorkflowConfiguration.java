package io.yak.ops.business.workflow.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import io.yak.ops.business.workflow.dag.WorkflowDagCompiler;
import io.yak.ops.business.workflow.schedule.WorkflowQuartzJob;
import io.yak.ops.core.workflow.LocalWorkflowTaskDispatcher;
import io.yak.ops.core.workflow.WorkflowTaskExecutorRegistry;
import io.yak.ops.spi.workflow.WorkflowTaskExecutor;
import java.util.List;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.quartz.SchedulerFactoryBeanCustomizer;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.transaction.PlatformTransactionManager;

/** Infrastructure wiring for the single-process workflow runtime. */
@ConditionalOnWorkflowEnabled
@Configuration(proxyBeanMethods = false)
@EnableScheduling
@EnableConfigurationProperties(WorkflowProperties.class)
public class WorkflowConfiguration {

  @Bean(name = "workflowDataSource", destroyMethod = "close")
  public HikariDataSource workflowDataSource(WorkflowProperties properties) {
    WorkflowProperties.Datasource datasource = properties.getDatasource();
    HikariConfig config = new HikariConfig();
    config.setPoolName("YakWorkflowPool");
    config.setJdbcUrl(datasource.getUrl());
    config.setUsername(datasource.getUsername());
    config.setPassword(datasource.getPassword());
    config.setDriverClassName(datasource.getDriverClassName());
    config.setMaximumPoolSize(datasource.getMaximumPoolSize());
    config.setMinimumIdle(datasource.getMinimumIdle());
    config.setAutoCommit(true);
    return new HikariDataSource(config);
  }

  @Bean(name = "workflowTransactionManager")
  public PlatformTransactionManager workflowTransactionManager(
      @Qualifier("workflowDataSource") DataSource dataSource) {
    return new DataSourceTransactionManager(dataSource);
  }

  @Bean(initMethod = "migrate")
  public Flyway workflowFlyway(@Qualifier("workflowDataSource") DataSource dataSource) {
    return Flyway.configure()
        .dataSource(dataSource)
        .locations("classpath:db/migration/yak-workflow")
        .table("yak_wf_schema_history")
        .baselineOnMigrate(true)
        .load();
  }

  @Bean
  public NamedParameterJdbcTemplate workflowJdbcTemplate(
      @Qualifier("workflowDataSource") DataSource dataSource) {
    return new NamedParameterJdbcTemplate(dataSource);
  }

  @Bean
  public WorkflowTaskExecutorRegistry workflowTaskExecutorRegistry(
      List<WorkflowTaskExecutor> executors) {
    return new WorkflowTaskExecutorRegistry(executors);
  }

  @Bean
  public WorkflowDagCompiler workflowDagCompiler(WorkflowTaskExecutorRegistry registry) {
    return new WorkflowDagCompiler(registry);
  }

  @Bean
  public SchedulerFactoryBeanCustomizer workflowSchedulerContextCustomizer() {
    return factory -> {
      factory.setApplicationContextSchedulerContextKey(WorkflowQuartzJob.APPLICATION_CONTEXT_KEY);
    };
  }

  @Bean(destroyMethod = "close")
  public LocalWorkflowTaskDispatcher workflowTaskDispatcher(WorkflowProperties properties) {
    WorkflowProperties.Executor executor = properties.getExecutor();
    return new LocalWorkflowTaskDispatcher(
        executor.getCorePoolSize(),
        executor.getMaximumPoolSize(),
        executor.getQueueCapacity(),
        executor.getThreadNamePrefix());
  }
}
