package io.yak.ops.plugin.storage.minio;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** MinIO 资源存储配置。 */
@ConfigurationProperties(prefix = "yak.resource.storage.minio")
public class MinioStorageProperties {

  private boolean enabled = true;
  private String endpoint = "http://127.0.0.1:9000";
  private String accessKey = "minioadmin";
  private String secretKey = "minioadmin";
  private String bucket = "yak-ops";
  private String basePrefix = "resources";
  private boolean autoCreateBucket = true;

  public boolean isEnabled() {
    return enabled;
  }

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

  public String getEndpoint() {
    return endpoint;
  }

  public void setEndpoint(String endpoint) {
    this.endpoint = endpoint;
  }

  public String getAccessKey() {
    return accessKey;
  }

  public void setAccessKey(String accessKey) {
    this.accessKey = accessKey;
  }

  public String getSecretKey() {
    return secretKey;
  }

  public void setSecretKey(String secretKey) {
    this.secretKey = secretKey;
  }

  public String getBucket() {
    return bucket;
  }

  public void setBucket(String bucket) {
    this.bucket = bucket;
  }

  public String getBasePrefix() {
    return basePrefix;
  }

  public void setBasePrefix(String basePrefix) {
    this.basePrefix = basePrefix;
  }

  public boolean isAutoCreateBucket() {
    return autoCreateBucket;
  }

  public void setAutoCreateBucket(boolean autoCreateBucket) {
    this.autoCreateBucket = autoCreateBucket;
  }
}
