package io.yak.ops.common.bean.dto.sync.offline;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

/**
 * 离线同步任务级调度配置。
 *
 * <p>调度配置与 basic、source、sink、channel、mapping 同级保存。Quartz 只负责
 * 时间触发，业务失败重跑仍由离线同步执行状态机负责。</p>
 */
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
public class OfflineJobScheduleDTO {

  /** Quartz Cron 表达式，例如 0 0 2 * * ?。 */
  private String cron = "";

  /** 是否启用定时调度。 */
  private Boolean enabled = false;

  /** 业务执行失败后是否自动重跑一次。 */
  private Boolean retryOnFailure = false;
}
