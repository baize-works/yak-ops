package io.yak.ops.business.sync.realtime.deployment;

import io.yak.ops.business.sync.realtime.config.ConditionalOnRealtimeSyncEnabled;
import io.yak.ops.business.sync.realtime.model.enums.DeploymentMode;
import java.util.List;
import org.springframework.stereotype.Component;

/** 根据部署模式选择唯一适配器。 */
@ConditionalOnRealtimeSyncEnabled
@Component
public class FlinkCdcDeploymentGatewayRegistry {

  private final List<FlinkCdcDeploymentGateway> gateways;

  public FlinkCdcDeploymentGatewayRegistry(List<FlinkCdcDeploymentGateway> gateways) {
    this.gateways = List.copyOf(gateways);
  }

  public FlinkCdcDeploymentGateway require(DeploymentMode mode) {
    List<FlinkCdcDeploymentGateway> matched = gateways.stream()
        .filter(gateway -> gateway.supports(mode))
        .toList();
    if (matched.size() != 1) {
      throw new IllegalStateException(
          "部署模式 " + mode + " 需要且只能有一个适配器，当前数量：" + matched.size());
    }
    return matched.getFirst();
  }
}
