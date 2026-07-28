package io.yak.ops.business.workflow.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Runtime and persistence settings for the lightweight workflow engine. */
@ConfigurationProperties(prefix = "yak.workflow")
public class WorkflowProperties {

  private boolean enabled = true;
  private final Datasource datasource = new Datasource();
  private final Executor executor = new Executor();
  private final Recovery recovery = new Recovery();

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

  public Recovery getRecovery() {
    return recovery;
  }

  public static class Datasource {

    private String url = "jdbc:mariadb://127.0.0.1:3306/yak_security?useUnicode=true&characterEncoding=UTF-8&useSSL=false&serverTimezone=Asia/Shanghai";
    private String username = "root";
    private String password = "123456";
    private String driverClassName = "org.mariadb.jdbc.Driver";
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

  public static class Executor {

    private int corePoolSize = Math.max(2, Runtime.getRuntime().availableProcessors());
    private int maximumPoolSize = Math.max(4, Runtime.getRuntime().availableProcessors() * 2);
    private int queueCapacity = 500;
    private int defaultWorkflowParallelism = 4;
    private String threadNamePrefix = "yak-workflow-";

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

    public int getDefaultWorkflowParallelism() {
      return defaultWorkflowParallelism;
    }

    public void setDefaultWorkflowParallelism(int defaultWorkflowParallelism) {
      this.defaultWorkflowParallelism = defaultWorkflowParallelism;
    }

    public String getThreadNamePrefix() {
      return threadNamePrefix;
    }

    public void setThreadNamePrefix(String threadNamePrefix) {
      this.threadNamePrefix = threadNamePrefix;
    }
  }

  public static class Recovery {

    private boolean enabled = true;
    private long initialDelayMillis = 5_000L;
    private long fixedDelayMillis = 10_000L;

    public boolean isEnabled() {
      return enabled;
    }

    public void setEnabled(boolean enabled) {
      this.enabled = enabled;
    }

    public long getInitialDelayMillis() {
      return initialDelayMillis;
    }

    public void setInitialDelayMillis(long initialDelayMillis) {
      this.initialDelayMillis = initialDelayMillis;
    }

    public long getFixedDelayMillis() {
      return fixedDelayMillis;
    }

    public void setFixedDelayMillis(long fixedDelayMillis) {
      this.fixedDelayMillis = fixedDelayMillis;
    }
  }
}
