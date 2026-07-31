package io.yak.ops.business.resource.config;

import com.baomidou.mybatisplus.annotation.DbType;
import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;
import com.baomidou.mybatisplus.extension.spring.MybatisSqlSessionFactoryBean;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import io.yak.ops.common.mybatis.MybatisPlusFactorySupport;
import javax.sql.DataSource;
import org.apache.ibatis.session.SqlSessionFactory;
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

/** 资源管理模块基础设施配置。 */
@Configuration(proxyBeanMethods = false)
@ConditionalOnResourceEnabled
@EnableConfigurationProperties(ResourceProperties.class)
@MapperScan(
    basePackages = "io.yak.ops.business.resource.dao.mapper",
    sqlSessionFactoryRef = "opsResourceSqlSessionFactory")
public class ResourceConfiguration {

  @Bean(name = "opsResourceDataSource", destroyMethod = "close")
  public HikariDataSource opsResourceDataSource(ResourceProperties properties) {
    ResourceProperties.Database database = properties.getDatabase();
    HikariConfig config = new HikariConfig();
    config.setPoolName("YakOpsResourcePool");
    config.setJdbcUrl(database.getUrl());
    config.setUsername(database.getUsername());
    config.setPassword(database.getPassword());
    config.setDriverClassName(database.getDriverClassName());
    config.setMinimumIdle(database.getMinimumIdle());
    config.setMaximumPoolSize(database.getMaximumPoolSize());
    config.setAutoCommit(true);
    return new HikariDataSource(config);
  }

  @Bean(name = "opsResourceTransactionManager")
  public PlatformTransactionManager opsResourceTransactionManager(
      @Qualifier("opsResourceDataSource") DataSource dataSource) {
    return new DataSourceTransactionManager(dataSource);
  }

  @Bean(name = "opsResourceSqlSessionFactory")
  public SqlSessionFactory opsResourceSqlSessionFactory(
      @Qualifier("opsResourceDataSource") DataSource dataSource) throws Exception {
    MybatisSqlSessionFactoryBean factory = new MybatisSqlSessionFactoryBean();
    factory.setDataSource(dataSource);
    factory.setTypeAliasesPackage("io.yak.ops.common.bean.po.resource");
    factory.setConfiguration(MybatisPlusFactorySupport.createConfiguration());
    factory.setGlobalConfig(MybatisPlusFactorySupport.createGlobalConfig());

    MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
    interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
    factory.setPlugins(interceptor);
    return factory.getObject();
  }

  @Bean(name = "opsResourceSqlSessionTemplate")
  public SqlSessionTemplate opsResourceSqlSessionTemplate(
      @Qualifier("opsResourceSqlSessionFactory") SqlSessionFactory sqlSessionFactory) {
    return new SqlSessionTemplate(sqlSessionFactory);
  }

  @Bean(initMethod = "migrate")
  public Flyway opsResourceFlyway(@Qualifier("opsResourceDataSource") DataSource dataSource) {
    return Flyway.configure()
        .dataSource(dataSource)
        .locations("classpath:db/migration/yak-resource")
        .table("yak_resource_schema_history")
        .baselineVersion(MigrationVersion.fromVersion("0"))
        .baselineOnMigrate(true)
        .load();
  }
}
