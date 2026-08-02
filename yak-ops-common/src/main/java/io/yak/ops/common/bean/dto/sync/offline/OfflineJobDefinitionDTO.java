package io.yak.ops.common.bean.dto.sync.offline;

import com.fasterxml.jackson.annotation.JsonAnyGetter;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.Data;

/**
 * 离线同步任务定义入参。动态节点配置通过扩展字段原样保留。
 *
 * @author weifuwan
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
public class OfflineJobDefinitionDTO {

  private Long id;
  private String mode;
  private OfflineJobBasicDTO basic;
  private JsonNode source;
  private JsonNode sink;
  private JsonNode transform;
  private JsonNode mapping;
  private JsonNode schedule;
  private JsonNode env;

  /** Worker 选择策略：mode、nodeId 和 requiredLabels。 */
  private JsonNode worker;

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
