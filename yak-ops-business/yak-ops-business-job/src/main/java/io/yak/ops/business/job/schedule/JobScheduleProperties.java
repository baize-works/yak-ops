package io.yak.ops.business.job.schedule;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Yak Ops 业务调度注册配置。
 */
@ConfigurationProperties("yak.job.schedule")
public class JobScheduleProperties {

  private boolean enabled = true;
  private long initialDelayMillis = 2_000L;
  private long fixedDelayMillis = 5_000L;
  private String zoneId = "Asia/Shanghai";

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

  public String getZoneId() {
    return zoneId;
  }

  public void setZoneId(String zoneId) {
    this.zoneId = zoneId;
  }
}
