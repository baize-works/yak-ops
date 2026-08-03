package io.yak.ops.common.bean.dto.sync.offline;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

/**
 * 离线同步传输通道配置。
 *
 * @author weifuwan
 */
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
public class OfflineJobChannelDTO {

  private Integer parallelism = 1;
  private Boolean speedLimitEnabled = false;
  private Long recordsPerSecond = 10000L;
  private String dirtyDataPolicy = "STOP";
  private Long dirtyDataLimit = 0L;
}
