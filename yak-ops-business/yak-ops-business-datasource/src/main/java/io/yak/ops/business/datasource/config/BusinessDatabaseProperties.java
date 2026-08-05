package io.yak.ops.business.datasource.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Yak Ops 业务模块共享数据库配置。 */
@ConfigurationProperties(prefix = "yak.database")
public class BusinessDatabaseProperties {

  private boolean enabled = true;
  private String url =
      "jdbc:mysql://127.0.0.1:3306/yak_security"
          + "?useUnicode=true&allowPublicKeyRetrieval=true&characterEncoding=UTF-8"
          + "&useSSL=false&serverTimezone=Asia/Shanghai";
  private String username = "root";
  private String password = "123456";
  private String driverClassName = "com.mysql.cj.jdbc.Driver";
  private int minimumIdle = 1;
  private int maximumPoolSize = 8;

  public boolean isEnabled() {
    return enabled;
  }

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

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
