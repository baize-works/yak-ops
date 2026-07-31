package io.yak.ops.plugin.storage.hdfs;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** HDFS 资源存储配置。 */
@ConfigurationProperties(prefix = "yak.resource.storage.hdfs")
public class HdfsStorageProperties {

  private boolean enabled;
  private String uri = "hdfs://127.0.0.1:9000";
  private String user = "hdfs";
  private String baseDirectory = "/yak-ops/resources";
  private short replication = 1;

  public boolean isEnabled() {
    return enabled;
  }

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

  public String getUri() {
    return uri;
  }

  public void setUri(String uri) {
    this.uri = uri;
  }

  public String getUser() {
    return user;
  }

  public void setUser(String user) {
    this.user = user;
  }

  public String getBaseDirectory() {
    return baseDirectory;
  }

  public void setBaseDirectory(String baseDirectory) {
    this.baseDirectory = baseDirectory;
  }

  public short getReplication() {
    return replication;
  }

  public void setReplication(short replication) {
    this.replication = replication;
  }
}
