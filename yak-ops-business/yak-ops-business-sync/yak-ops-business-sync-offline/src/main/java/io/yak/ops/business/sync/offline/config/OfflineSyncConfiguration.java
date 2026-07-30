package io.yak.ops.business.sync.offline.config;

import com.baomidou.mybatisplus.annotation.DbType;
import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;
import com.baomidou.mybatisplus.extension.spring.MybatisSqlSessionFactoryBean;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.net.http.HttpClient;
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

/** 离线同步模块基础设施配置。 */
@ConditionalOnOfflineSyncEnabled
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(OfflineSyncProperties.class)
@MapperScan(
    basePackages = "io.yak.ops.business.sync.offline.dao.mapper",
    sqlSessionFactoryRef = "offlineSyncSqlSessionFactory")
public class OfflineSyncConfiguration {

  @Bean(name = "offlineSyncDataSource", destroyMethod = "close")
  public HikariDataSource offlineSyncDataSource(OfflineSyncProperties properties) {
    OfflineSyncProperties.Datasource datasource = properties.getDatasource();
    HikariConfig config = new HikariConfig();
    config.setPoolName("YakOfflineSyncPool");
    config.setJdbcUrl(datasource.getUrl());
    config.setUsername(datasource.getUsername());
    config.setPassword(datasource.getPassword());
    config.setDriverClassName(datasource.getDriverClassName());
    config.setMaximumPoolSize(datasource.getMaximumPoolSize());
    config.setMinimumIdle(datasource.getMinimumIdle());
    config.setAutoCommit(true);
    return new HikariDataSource(config);
  }

  @Bean(name = "offlineSyncTransactionManager")
  public PlatformTransactionManager offlineSyncTransactionManager(
      @Qualifier("offlineSyncDataSource") DataSource dataSource) {
    return new DataSourceTransactionManager(dataSource);
  }

  @Bean(name = "offlineSyncSqlSessionFactory")
  public SqlSessionFactory offlineSyncSqlSessionFactory(
      @Qualifier("offlineSyncDataSource") DataSource dataSource) throws Exception {
    MybatisSqlSessionFactoryBean factory = new MybatisSqlSessionFactoryBean();
    factory.setDataSource(dataSource);
    factory.setTypeAliasesPackage("io.yak.ops.common.bean.po.sync.offline");
    MybatisConfiguration configuration = new MybatisConfiguration();
    configuration.setMapUnderscoreToCamelCase(true);
    configuration.setJdbcTypeForNull(JdbcType.NULL);
    configuration.setCacheEnabled(false);
    factory.setConfiguration(configuration);
    MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
    interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
    factory.setPlugins(interceptor);
    return factory.getObject();
  }

  @Bean(name = "offlineSyncSqlSessionTemplate")
  public SqlSessionTemplate offlineSyncSqlSessionTemplate(
      @Qualifier("offlineSyncSqlSessionFactory") SqlSessionFactory sqlSessionFactory) {
    return new SqlSessionTemplate(sqlSessionFactory);
  }

  @Bean(initMethod = "migrate")
  public Flyway offlineSyncFlyway(
      @Qualifier("offlineSyncDataSource") DataSource dataSource) {
    return Flyway.configure()
        .dataSource(dataSource)
        .locations("classpath:db/migration/yak-offline-sync")
        .table("yak_offline_schema_history")
        .baselineVersion(MigrationVersion.fromVersion("0"))
        .baselineOnMigrate(true)
        .load();
  }

  @Bean(name = "offlineSyncJsonMapper")
  public ObjectMapper offlineSyncJsonMapper() {
    return new ObjectMapper().findAndRegisterModules();
  }

  @Bean(name = "offlineSyncHttpClient")
  public HttpClient offlineSyncHttpClient(OfflineSyncProperties properties) {
    return HttpClient.newBuilder()
        .connectTimeout(properties.getEngine().getConnectTimeout())
        .build();
  }
}
