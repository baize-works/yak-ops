package io.yak.ops.business.sync.realtime.model.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.Data;

/** 实时同步任务保存参数。 */
@Data
public class RealtimeJobRequest {
  @NotBlank
  private String name;
  private String description;
  @NotNull
  private Long environmentId;
  @NotNull
  private Long cdcVersionId;
  @NotBlank
  private String pipelineYaml;
  private Map<String, String> runtimeOptions = new LinkedHashMap<>();
}
