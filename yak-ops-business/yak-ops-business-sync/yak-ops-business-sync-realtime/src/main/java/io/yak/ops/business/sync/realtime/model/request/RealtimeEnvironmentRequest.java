package io.yak.ops.business.sync.realtime.model.request;

import io.yak.ops.business.sync.realtime.model.enums.DeploymentMode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.Data;

/** 运行环境保存参数。 */
@Data
public class RealtimeEnvironmentRequest {
  @NotBlank
  private String name;
  @NotNull
  private DeploymentMode deploymentMode;
  @NotBlank
  private String flinkVersion;
  @NotNull
  private Long cdcVersionId;
  private String flinkHome;
  private String restAddress;
  private String clusterId;
  private String namespace;
  private Map<String, String> deploymentConfig = new LinkedHashMap<>();
  private boolean enabled = true;
}
