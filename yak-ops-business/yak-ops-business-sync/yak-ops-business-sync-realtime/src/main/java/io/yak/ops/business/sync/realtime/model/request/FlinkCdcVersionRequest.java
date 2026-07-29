package io.yak.ops.business.sync.realtime.model.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** Flink CDC 版本保存参数。 */
@Data
public class FlinkCdcVersionRequest {
  @NotBlank
  private String version;
  @NotBlank
  private String displayName;
  @NotBlank
  private String flinkMinVersion;
  @NotBlank
  private String flinkMaxVersion;
  private String cdcHome;
  private String connectorDirectory;
  private String description;
  private boolean enabled = true;
}
