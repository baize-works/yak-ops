package io.yak.ops.common.bean.vo.sync.offline;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Yak Ops 与 Link-Up 统一执行日志条目。 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OfflineExecutionLogEntryVO {
  private long sequence;
  private Long timestampMillis;
  private String timestamp;
  /** YAK_OPS / LINK_UP。 */
  private String source;
  private String level;
  private String stage;
  private String externalExecutionId;
  private String engineJobId;
  private String runId;
  private String thread;
  private String logger;
  private String message;
}
