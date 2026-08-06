package io.yak.ops.business.quality.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "yak.quality")
public class QualityProperties {

  private boolean enabled = true;
  private final Executor executor = new Executor();
  private final Scheduler scheduler = new Scheduler();

  public boolean isEnabled() {
    return enabled;
  }

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

  public Executor getExecutor() {
    return executor;
  }

  public Scheduler getScheduler() {
    return scheduler;
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

  public static class Scheduler {
    private long pollIntervalMs = 30000L;
    private int batchSize = 50;

    public long getPollIntervalMs() {
      return pollIntervalMs;
    }

    public void setPollIntervalMs(long pollIntervalMs) {
      this.pollIntervalMs = pollIntervalMs;
    }

    public int getBatchSize() {
      return batchSize;
    }

    public void setBatchSize(int batchSize) {
      this.batchSize = batchSize;
    }
  }
}
