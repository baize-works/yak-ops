package io.yak.ops.business.development.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Persistence and local execution-gateway settings for data development. */
@ConfigurationProperties(prefix = "yak.data-development")
public class DataDevelopmentProperties {

  private boolean enabled;
  private final Datasource datasource = new Datasource();
  private final Execution execution = new Execution();

  public boolean isEnabled() {
    return enabled;
  }

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

  public Datasource getDatasource() {
    return datasource;
  }

  public Execution getExecution() {
    return execution;
  }

  public static class Datasource {

    private String url;
    private String username;
    private String password;
    private String driverClassName = "com.mysql.cj.jdbc.Driver";
    private int maximumPoolSize = 8;
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

  public static class Execution {

    private int corePoolSize = 4;
    private int maximumPoolSize = 16;
    private int queueCapacity = 200;
    private int defaultTimeoutSeconds = 300;
    private int eventReplayLimit = 1000;
    private String workerId = "local-worker";

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

    public int getDefaultTimeoutSeconds() {
      return defaultTimeoutSeconds;
    }

    public void setDefaultTimeoutSeconds(int defaultTimeoutSeconds) {
      this.defaultTimeoutSeconds = defaultTimeoutSeconds;
    }

    public int getEventReplayLimit() {
      return eventReplayLimit;
    }

    public void setEventReplayLimit(int eventReplayLimit) {
      this.eventReplayLimit = eventReplayLimit;
    }

    public String getWorkerId() {
      return workerId;
    }

    public void setWorkerId(String workerId) {
      this.workerId = workerId;
    }
  }
}
