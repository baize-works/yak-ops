package io.yak.ops.plugin.storage.local;

import io.yak.ops.spi.storage.StorageOperator;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;

/** 本地存储插件自动装配。 */
@AutoConfiguration
@ConditionalOnClass(StorageOperator.class)
@ConditionalOnProperty(
    prefix = "yak.resource.storage.local",
    name = "enabled",
    havingValue = "true",
    matchIfMissing = true)
@EnableConfigurationProperties(LocalStorageProperties.class)
public class LocalStorageAutoConfiguration {

  @Bean
  @ConditionalOnMissingBean(name = "localResourceStorageOperator")
  public StorageOperator localResourceStorageOperator(LocalStorageProperties properties) {
    return new LocalStorageOperator(properties);
  }
}
