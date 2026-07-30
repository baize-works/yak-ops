package io.yak.ops.business.sync.realtime.model.response;

import io.yak.ops.business.sync.realtime.model.enums.JobState;
import io.yak.ops.business.sync.realtime.model.po.RealtimeJobPO;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.Value;

/** 实时同步任务接口视图。 */
@Value
public class RealtimeJobView {
  Long id;
  String name;
  String description;
  Long environmentId;
  Long cdcVersionId;
  String pipelineYaml;
  Map<String, String> runtimeOptions;
  JobState state;
  Long currentDeploymentId;
  Date createdAt;
  Date updatedAt;

  public static RealtimeJobView from(
      RealtimeJobPO value, Map<String, String> runtimeOptions) {
    return new RealtimeJobView(
        value.getId(),
        value.getName(),
        value.getDescription(),
        value.getEnvironmentId(),
        value.getCdcVersionId(),
        value.getPipelineYaml(),
        Collections.unmodifiableMap(new LinkedHashMap<>(runtimeOptions)),
        JobState.valueOf(value.getState()),
        value.getCurrentDeploymentId(),
        value.getCreatedAt(),
        value.getUpdatedAt());
  }
}
