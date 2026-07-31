package io.yak.ops.plugin.storage.minio;

import io.minio.MinioClient;
import io.yak.ops.spi.storage.StorageOperator;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;

/** MinIO 存储插件自动装配。 */
@AutoConfiguration
@ConditionalOnClass(MinioClient.class)
@ConditionalOnProperty(
    prefix = "yak.resource.storage.minio",
    name = "enabled",
    havingValue = "true",
    matchIfMissing = true)
@EnableConfigurationProperties(MinioStorageProperties.class)
public class MinioStorageAutoConfiguration {

  @Bean
  @ConditionalOnMissingBean(name = "minioResourceStorageOperator")
  public StorageOperator minioResourceStorageOperator(MinioStorageProperties properties) {
    MinioClient client = MinioClient.builder()
        .endpoint(properties.getEndpoint())
        .credentials(properties.getAccessKey(), properties.getSecretKey())
        .build();
    return new MinioStorageOperator(client, properties);
  }
}
