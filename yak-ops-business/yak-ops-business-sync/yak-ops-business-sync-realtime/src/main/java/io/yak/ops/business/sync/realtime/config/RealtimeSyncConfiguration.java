package io.yak.ops.business.sync.realtime.config;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.extension.spring.MybatisSqlSessionFactoryBean;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.net.http.HttpClient;
import java.time.Duration;
import javax.sql.DataSource;
import org.apache.ibatis.session.SqlSessionFactory;
import org.apache.ibatis.type.JdbcType;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.mybatis.spring.SqlSessionTemplate;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.PlatformTransactionManager;

/** 实时同步模块基础设施配置。 */
@ConditionalOnRealtimeSyncEnabled
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(RealtimeSyncProperties.class)
@MapperScan(
    basePackages = "io.yak.ops.business.sync.realtime.dao.mapper",
    sqlSessionFactoryRef = "realtimeSyncSqlSessionFactory")
public class RealtimeSyncConfiguration {

  @Bean(name = "realtimeSyncDataSource", destroyMethod = "close")
  public HikariDataSource realtimeSyncDataSource(RealtimeSyncProperties properties) {
    RealtimeSyncProperties.Datasource datasource = properties.getDatasource();
    HikariConfig config = new HikariConfig();
    config.setPoolName("YakRealtimeSyncPool");
    config.setJdbcUrl(datasource.getUrl());
    config.setUsername(datasource.getUsername());
    config.setPassword(datasource.getPassword());
    config.setDriverClassName(datasource.getDriverClassName());
    config.setMaximumPoolSize(datasource.getMaximumPoolSize());
    config.setMinimumIdle(datasource.getMinimumIdle());
    config.setAutoCommit(true);
    return new HikariDataSource(config);
  }

  @Bean(name = "realtimeSyncTransactionManager")
  public PlatformTransactionManager realtimeSyncTransactionManager(
      @Qualifier("realtimeSyncDataSource") DataSource dataSource) {
    return new DataSourceTransactionManager(dataSource);
  }

  @Bean(name = "realtimeSyncSqlSessionFactory")
  public SqlSessionFactory realtimeSyncSqlSessionFactory(
      @Qualifier("realtimeSyncDataSource") DataSource dataSource) throws Exception {
    MybatisSqlSessionFactoryBean factory = new MybatisSqlSessionFactoryBean();
    factory.setDataSource(dataSource);
    factory.setTypeAliasesPackage("io.yak.ops.business.sync.realtime.model.po");
    MybatisConfiguration configuration = new MybatisConfiguration();
    configuration.setMapUnderscoreToCamelCase(true);
    configuration.setJdbcTypeForNull(JdbcType.NULL);
    configuration.setCacheEnabled(false);
    factory.setConfiguration(configuration);
    return factory.getObject();
  }

  @Bean(name = "realtimeSyncSqlSessionTemplate")
  public SqlSessionTemplate realtimeSyncSqlSessionTemplate(
      @Qualifier("realtimeSyncSqlSessionFactory") SqlSessionFactory sqlSessionFactory) {
    return new SqlSessionTemplate(sqlSessionFactory);
  }

  @Bean(initMethod = "migrate")
  public Flyway realtimeSyncFlyway(
      @Qualifier("realtimeSyncDataSource") DataSource dataSource) {
    return Flyway.configure()
        .dataSource(dataSource)
        .locations("classpath:db/migration/yak-realtime-sync")
        .table("yak_rt_schema_history")
        .baselineVersion(MigrationVersion.fromVersion("0"))
        .baselineOnMigrate(true)
        .load();
  }

  @Bean(name = "realtimeSyncJsonMapper")
  public ObjectMapper realtimeSyncJsonMapper() {
    return new ObjectMapper().findAndRegisterModules();
  }

  @Bean(name = "realtimeSyncYamlMapper")
  public ObjectMapper realtimeSyncYamlMapper() {
    return new ObjectMapper(new YAMLFactory()).findAndRegisterModules();
  }

  @Bean
  public HttpClient realtimeSyncHttpClient() {
    return HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .build();
  }
}
