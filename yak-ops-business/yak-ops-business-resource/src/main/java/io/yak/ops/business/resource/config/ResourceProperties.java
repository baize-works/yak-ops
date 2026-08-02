package io.yak.ops.business.resource.config;

import io.yak.ops.common.enums.resource.ResourceStorageType;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Set;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** 资源管理模块配置。 */
@ConfigurationProperties(prefix = "yak.resource")
public class ResourceProperties {

  private boolean enabled = true;
  private long maxFileSize = 100L * 1024L * 1024L;
  private long editableMaxBytes = 2L * 1024L * 1024L;
  private final Database database = new Database();
  private final Storage storage = new Storage();
  private Set<String> editableSuffixes = new LinkedHashSet<>(Arrays.asList(
      "txt", "log", "sql", "json", "xml", "yaml", "yml", "conf", "properties",
      "sh", "py", "java", "js", "ts", "tsx", "md", "csv", "hocon"));

  public boolean isEnabled() {
    return enabled;
  }

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

  public long getMaxFileSize() {
    return maxFileSize;
  }

  public void setMaxFileSize(long maxFileSize) {
    this.maxFileSize = maxFileSize;
  }

  public long getEditableMaxBytes() {
    return editableMaxBytes;
  }

  public void setEditableMaxBytes(long editableMaxBytes) {
    this.editableMaxBytes = editableMaxBytes;
  }

  public Database getDatabase() {
    return database;
  }

  public Storage getStorage() {
    return storage;
  }

  public Set<String> getEditableSuffixes() {
    return editableSuffixes;
  }

  public void setEditableSuffixes(Set<String> editableSuffixes) {
    this.editableSuffixes = editableSuffixes;
  }

  /** 资源元数据数据库配置。 */
  public static class Database {

    private String url =
        "jdbc:mariadb://127.0.0.1:3306/yak_security"
            + "?useUnicode=true&allowPublicKeyRetrieval=true&characterEncoding=UTF-8"
            + "&useSSL=false&serverTimezone=Asia/Shanghai";
    private String username = "root";
    private String password = "123456";
    private String driverClassName = "org.mariadb.jdbc.Driver";
    private int minimumIdle = 1;
    private int maximumPoolSize = 8;

    public String getUrl() {
      return url;
    }

    public void setUrl(String url) {
      this.url = url;
    }

    public String getUsername() {
      return username;
    }

    public void setUsername(String username) {
      this.username = username;
    }

    public String getPassword() {
      return password;
    }

    public void setPassword(String password) {
      this.password = password;
    }

    public String getDriverClassName() {
      return driverClassName;
    }

    public void setDriverClassName(String driverClassName) {
      this.driverClassName = driverClassName;
    }

    public int getMinimumIdle() {
      return minimumIdle;
    }

    public void setMinimumIdle(int minimumIdle) {
      this.minimumIdle = minimumIdle;
    }

    public int getMaximumPoolSize() {
      return maximumPoolSize;
    }

    public void setMaximumPoolSize(int maximumPoolSize) {
      this.maximumPoolSize = maximumPoolSize;
    }
  }

  /** 当前资源存储选择。 */
  public static class Storage {

    private ResourceStorageType type = ResourceStorageType.LOCAL;

    public ResourceStorageType getType() {
      return type;
    }

    public void setType(ResourceStorageType type) {
      this.type = type;
    }
  }
}
