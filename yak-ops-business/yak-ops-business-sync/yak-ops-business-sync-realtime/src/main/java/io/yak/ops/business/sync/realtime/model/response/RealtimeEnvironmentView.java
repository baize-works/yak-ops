package io.yak.ops.business.sync.realtime.model.response;

import io.yak.ops.business.sync.realtime.model.enums.DeploymentMode;
import io.yak.ops.business.sync.realtime.model.po.RealtimeEnvironmentPO;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.Value;

/** 运行环境接口视图。 */
@Value
public class RealtimeEnvironmentView {
  Long id;
  String name;
  DeploymentMode deploymentMode;
  String flinkVersion;
  Long cdcVersionId;
  String flinkHome;
  String restAddress;
  String clusterId;
  String namespace;
  Map<String, String> deploymentConfig;
  Boolean enabled;
  Date createdAt;
  Date updatedAt;

  public static RealtimeEnvironmentView from(
      RealtimeEnvironmentPO value, Map<String, String> deploymentConfig) {
    return new RealtimeEnvironmentView(
        value.getId(),
        value.getName(),
        DeploymentMode.valueOf(value.getDeploymentMode()),
        value.getFlinkVersion(),
        value.getCdcVersionId(),
        value.getFlinkHome(),
        value.getRestAddress(),
        value.getClusterId(),
        value.getNamespace(),
        Collections.unmodifiableMap(new LinkedHashMap<>(deploymentConfig)),
        value.getEnabled(),
        value.getCreatedAt(),
        value.getUpdatedAt());
  }
}
