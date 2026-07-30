package io.yak.ops.business.sync.realtime.model.response;

import java.util.List;
import lombok.Value;

/** 部署适配器返回结果。 */
@Value
public class DeploymentResult {
  String externalId;
  List<String> command;
  String manifestPath;
  String output;
}
