package io.yak.ops.business.sync.offline.config;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.datasource.config.BusinessDatabaseConfiguration;
import java.net.http.HttpClient;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.scheduling.annotation.EnableScheduling;

/** 离线同步一期基础设施配置。 */
@ConditionalOnOfflineSyncEnabled
@Configuration(proxyBeanMethods = false)
@EnableScheduling
@EnableConfigurationProperties(OfflineSyncProperties.class)
@Import(BusinessDatabaseConfiguration.class)
@MapperScan(
    basePackages = "io.yak.ops.business.sync.offline.dao.mapper",
    sqlSessionFactoryRef = "yakBusinessSqlSessionFactory")
public class OfflineSyncConfiguration {

  @Bean(initMethod = "migrate")
  public Flyway offlineSyncFlyway(
      @Qualifier("yakBusinessDataSource") DataSource dataSource) {
    return Flyway.configure()
        .dataSource(dataSource)
        .locations("classpath:db/migration/yak-offline-sync")
        .table("yak_offline_core_schema_history")
        .baselineVersion(MigrationVersion.fromVersion("0"))
        .baselineOnMigrate(true)
        .load();
  }

  @Bean(name = "offlineSyncJsonMapper")
  public ObjectMapper offlineSyncJsonMapper() {
    return new ObjectMapper().findAndRegisterModules()
        .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
  }

  @Bean(name = "offlineSyncHttpClient")
  public HttpClient offlineSyncHttpClient(OfflineSyncProperties properties) {
    return HttpClient.newBuilder().connectTimeout(properties.getEngine().getConnectTimeout()).build();
  }
}
