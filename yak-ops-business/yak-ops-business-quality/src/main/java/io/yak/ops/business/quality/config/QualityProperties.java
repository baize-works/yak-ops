package io.yak.ops.business.quality.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "yak.quality")
public class QualityProperties {

  private boolean enabled = true;
  private final Executor executor = new Executor();

  public boolean isEnabled() {
    return enabled;
  }

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

  public Executor getExecutor() {
    return executor;
  }

  public static class Executor {

    private int corePoolSize = 2;
    private int maximumPoolSize = 6;
    private int queueCapacity = 100;
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

    public int getShutdownWaitSeconds() {
      return shutdownWaitSeconds;
    }

    public void setShutdownWaitSeconds(int shutdownWaitSeconds) {
      this.shutdownWaitSeconds = shutdownWaitSeconds;
    }
  }
}
