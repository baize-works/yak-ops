package io.yak.ops.business.sync.realtime.config;

import java.nio.file.Path;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** 实时同步模块运行与持久化配置。 */
@ConfigurationProperties(prefix = "yak.sync.realtime")
public class RealtimeSyncProperties {

  private boolean enabled = true;
  private Path workDirectory = Path.of(System.getProperty("java.io.tmpdir"), "yak-ops", "realtime-sync");
  private Duration processTimeout = Duration.ofMinutes(5);
  private String kubectlCommand = "kubectl";
  private String yarnCommand = "yarn";
  private final Datasource datasource = new Datasource();

  public boolean isEnabled() {
    return enabled;
  }

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

  public Path getWorkDirectory() {
    return workDirectory;
  }

  public void setWorkDirectory(Path workDirectory) {
    this.workDirectory = workDirectory;
  }

  public Duration getProcessTimeout() {
    return processTimeout;
  }

  public void setProcessTimeout(Duration processTimeout) {
    this.processTimeout = processTimeout;
  }

  public String getKubectlCommand() {
    return kubectlCommand;
  }

  public void setKubectlCommand(String kubectlCommand) {
    this.kubectlCommand = kubectlCommand;
  }

  public String getYarnCommand() {
    return yarnCommand;
  }

  public void setYarnCommand(String yarnCommand) {
    this.yarnCommand = yarnCommand;
  }

  public Datasource getDatasource() {
    return datasource;
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
}
