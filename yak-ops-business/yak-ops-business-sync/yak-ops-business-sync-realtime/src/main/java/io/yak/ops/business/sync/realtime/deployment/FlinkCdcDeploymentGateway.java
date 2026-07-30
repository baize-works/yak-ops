package io.yak.ops.business.sync.realtime.deployment;

import io.yak.ops.business.sync.realtime.model.enums.DeploymentMode;
import io.yak.ops.business.sync.realtime.model.response.DeploymentResult;
import io.yak.ops.business.sync.realtime.model.response.DeploymentStatus;
import io.yak.ops.business.sync.realtime.model.response.SavepointResult;

/** Flink CDC 部署目标适配器。 */
public interface FlinkCdcDeploymentGateway {

  boolean supports(DeploymentMode mode);

  DeploymentResult submit(FlinkCdcSubmission submission);

  void cancel(FlinkCdcSubmission submission);

  DeploymentStatus status(FlinkCdcSubmission submission);

  SavepointResult triggerSavepoint(FlinkCdcSubmission submission, String targetDirectory);
}
