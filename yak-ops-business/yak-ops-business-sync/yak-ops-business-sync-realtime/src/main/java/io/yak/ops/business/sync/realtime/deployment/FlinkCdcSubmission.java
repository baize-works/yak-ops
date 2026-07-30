package io.yak.ops.business.sync.realtime.deployment;

import io.yak.ops.business.sync.realtime.model.po.FlinkCdcVersionPO;
import io.yak.ops.business.sync.realtime.model.po.RealtimeDeploymentPO;
import io.yak.ops.business.sync.realtime.model.po.RealtimeEnvironmentPO;
import io.yak.ops.business.sync.realtime.model.po.RealtimeJobPO;
import java.nio.file.Path;
import java.util.Map;
import lombok.Value;

/** 部署适配器输入上下文。 */
@Value
public class FlinkCdcSubmission {
  RealtimeJobPO job;
  RealtimeEnvironmentPO environment;
  FlinkCdcVersionPO cdcVersion;
  RealtimeDeploymentPO deployment;
  Map<String, String> deploymentConfig;
  Map<String, String> runtimeOptions;
  String savepointPath;
  Path workDirectory;
}
