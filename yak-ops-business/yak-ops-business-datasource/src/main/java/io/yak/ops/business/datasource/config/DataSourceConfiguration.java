package io.yak.ops.business.datasource.config;

import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

/** 数据源管理模块基础设施配置。 */
@Configuration(proxyBeanMethods = false)
@ConditionalOnDataSourceEnabled
@EnableConfigurationProperties(DataSourceProperties.class)
@Import(BusinessDatabaseConfiguration.class)
@MapperScan(
    basePackages = "io.yak.ops.business.datasource.dao.mapper",
    sqlSessionFactoryRef = "yakBusinessSqlSessionFactory")
public class DataSourceConfiguration {

  @Bean(initMethod = "migrate")
  public Flyway opsDataSourceFlyway(
      @Qualifier("yakBusinessDataSource") DataSource dataSource) {
    return Flyway.configure()
        .dataSource(dataSource)
        .locations("classpath:db/migration/yak-datasource")
        .table("yak_ds_schema_history")
        .baselineVersion(MigrationVersion.fromVersion("0"))
        .baselineOnMigrate(true)
        .load();
  }
}
