package io.yak.ops.common.bean.dto.sync.offline;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

/**
 * 离线同步任务定义入参。
 *
 * <p>离线同步是固定的 Source -> Channel -> Sink 链路，不再保存前端 workflow
 * 节点、边和画布位置等交互状态。</p>
 *
 * @author weifuwan
 */
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
public class OfflineJobDefinitionDTO {

  private Long id;
  private OfflineJobBasicDTO basic;
  private OfflineJobEndpointDTO source;
  private OfflineJobEndpointDTO sink;
  private OfflineJobChannelDTO channel;
}
