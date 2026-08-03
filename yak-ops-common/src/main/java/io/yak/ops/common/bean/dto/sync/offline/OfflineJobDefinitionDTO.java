package io.yak.ops.common.bean.dto.sync.offline;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

/**
 * 离线同步任务定义入参。
 *
 * <p>离线同步是固定的 Source -> Channel -> Sink 链路。字段映射作为任务级配置
 * 与 basic、source、sink、channel 同级保存，不再挂载到任一端点配置中。</p>
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

  /** 单表同步任务级字段映射。 */
  private OfflineJobMappingDTO mapping;
}
