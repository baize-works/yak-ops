package io.yak.ops.plugin.storage.local;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** 本地资源存储配置。 */
@ConfigurationProperties(prefix = "yak.resource.storage.local")
public class LocalStorageProperties {

  private boolean enabled = true;
  private String baseDirectory = "./data/resources";
  private boolean checksumEnabled = true;

  public boolean isEnabled() {
    return enabled;
  }

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

  public String getBaseDirectory() {
    return baseDirectory;
  }

  public void setBaseDirectory(String baseDirectory) {
    this.baseDirectory = baseDirectory;
  }

  public boolean isChecksumEnabled() {
    return checksumEnabled;
  }

  public void setChecksumEnabled(boolean checksumEnabled) {
    this.checksumEnabled = checksumEnabled;
  }
}
