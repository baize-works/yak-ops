package io.yak.ops.business.quality.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "yak.quality")
public class QualityProperties {

  private boolean enabled = true;
  private final Datasource datasource = new Datasource();
  private final Executor executor = new Executor();

  public boolean isEnabled() {
    return enabled;
  }

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

  public Datasource getDatasource() {
    return datasource;
  }

  public Executor getExecutor() {
    return executor;
  }

  public static class Datasource {

    private String url =
        "jdbc:mysql://127.0.0.1:3306/yak_security"
            + "?useUnicode=true&allowPublicKeyRetrieval=true&characterEncoding=UTF-8"
            + "&useSSL=false&serverTimezone=Asia/Shanghai";
    private String username = "root";
    private String password = "123456";
    private String driverClassName = "com.mysql.cj.jdbc.Driver";
    private int maximumPoolSize = 6;
    private int minimumIdle = 1;

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

    public int getMaximumPoolSize() {
      return maximumPoolSize;
    }

    public void setMaximumPoolSize(int maximumPoolSize) {
      this.maximumPoolSize = maximumPoolSize;
    }

    public int getMinimumIdle() {
      return minimumIdle;
    }

    public void setMinimumIdle(int minimumIdle) {
      this.minimumIdle = minimumIdle;
    }
  }

  public static class Executor {

    private int corePoolSize = 2;
    private int maximumPoolSize = 8;
    private int queueCapacity = 200;
    private int recoveryBatchSize = 500;
    private int shutdownWaitSeconds = 20;

    public int getCorePoolSize() {
      return corePoolSize;
    }

    public void setCorePoolSize(int corePoolSize) {
      this.corePoolSize = corePoolSize;
    }

    public int getMaximumPoolSize() {
      return maximumPoolSize;
    }

    public void setMaximumPoolSize(int maximumPoolSize) {
      this.maximumPoolSize = maximumPoolSize;
    }

    public int getQueueCapacity() {
      return queueCapacity;
    }

    public void setQueueCapacity(int queueCapacity) {
      this.queueCapacity = queueCapacity;
    }

    public int getRecoveryBatchSize() {
      return recoveryBatchSize;
    }

    public void setRecoveryBatchSize(int recoveryBatchSize) {
      this.recoveryBatchSize = recoveryBatchSize;
    }

    public int getShutdownWaitSeconds() {
      return shutdownWaitSeconds;
    }

    public void setShutdownWaitSeconds(int shutdownWaitSeconds) {
      this.shutdownWaitSeconds = shutdownWaitSeconds;
    }
  }
}
