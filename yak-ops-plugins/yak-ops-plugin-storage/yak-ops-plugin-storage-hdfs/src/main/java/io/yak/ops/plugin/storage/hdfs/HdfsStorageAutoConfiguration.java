package io.yak.ops.plugin.storage.hdfs;

import io.yak.ops.spi.storage.StorageOperator;
import java.io.IOException;
import java.net.URI;
import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.fs.FileSystem;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;

/** HDFS 存储插件自动装配。 */
@AutoConfiguration
@ConditionalOnClass(FileSystem.class)
@ConditionalOnProperty(
    prefix = "yak.resource.storage.hdfs",
    name = "enabled",
    havingValue = "true")
@EnableConfigurationProperties(HdfsStorageProperties.class)
public class HdfsStorageAutoConfiguration {

  @Bean(name = "yakResourceHdfsFileSystem", destroyMethod = "close")
  @ConditionalOnMissingBean(name = "yakResourceHdfsFileSystem")
  public FileSystem yakResourceHdfsFileSystem(HdfsStorageProperties properties) throws IOException {
    Configuration configuration = new Configuration();
    configuration.set("fs.defaultFS", properties.getUri());
    try {
      return FileSystem.get(URI.create(properties.getUri()), configuration, properties.getUser());
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new IOException("创建 HDFS FileSystem 时线程被中断", exception);
    }
  }

  @Bean
  @ConditionalOnMissingBean(name = "hdfsResourceStorageOperator")
  public StorageOperator hdfsResourceStorageOperator(
      @Qualifier("yakResourceHdfsFileSystem") FileSystem yakResourceHdfsFileSystem,
      HdfsStorageProperties properties) {
    return new HdfsStorageOperator(yakResourceHdfsFileSystem, properties);
  }
}
