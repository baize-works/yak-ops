package io.yak.ops.common.bean.dto.sync.offline;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.Data;

/**
 * 离线同步 Source 或 Sink 端点配置。
 *
 * @author weifuwan
 */
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
public class OfflineJobEndpointDTO {

  private String connectorId;
  private String pluginName;
  private String dbType;
  private String dataSourceId;
  private JsonNode config;
}
