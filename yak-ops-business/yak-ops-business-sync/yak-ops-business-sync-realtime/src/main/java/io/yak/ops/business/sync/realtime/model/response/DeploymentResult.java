package io.yak.ops.business.sync.realtime.model.response;

import java.util.List;

/** 部署适配器返回结果。 */
public record DeploymentResult(
    String externalId,
    List<String> command,
    String manifestPath,
    String output) {
}
