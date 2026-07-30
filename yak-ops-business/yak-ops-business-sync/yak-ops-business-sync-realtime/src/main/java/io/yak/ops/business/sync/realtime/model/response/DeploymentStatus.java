package io.yak.ops.business.sync.realtime.model.response;

import io.yak.ops.business.sync.realtime.model.enums.DeploymentState;

/** 外部集群任务状态。 */
public record DeploymentStatus(DeploymentState state, String rawState, String detail) {
}
