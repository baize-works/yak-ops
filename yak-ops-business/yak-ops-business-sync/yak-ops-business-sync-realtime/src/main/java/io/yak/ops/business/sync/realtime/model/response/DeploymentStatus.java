package io.yak.ops.business.sync.realtime.model.response;

import io.yak.ops.business.sync.realtime.model.enums.DeploymentState;
import lombok.Value;

/** 外部集群任务状态。 */
@Value
public class DeploymentStatus {
  DeploymentState state;
  String rawState;
  String detail;
}
