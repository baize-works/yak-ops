package io.yak.ops.common.bean.dto.sync.offline;

import com.fasterxml.jackson.annotation.JsonAnyGetter;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.Data;

/**
 * 离线同步任务基础配置。
 *
 * @author weifuwan
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
public class OfflineJobBasicDTO {

  private String jobName;
  private String jobDesc;
  private String mode;
  private String hoconConfig;
  private String jobDefinitionInfo;
  private String script;

  private final Map<String, JsonNode> extensions = new LinkedHashMap<>();

  @JsonAnySetter
  public void putExtension(String name, JsonNode value) {
    extensions.put(name, value);
  }

  @JsonAnyGetter
  public Map<String, JsonNode> getExtensions() {
    return extensions;
  }
}
