package io.yak.ops.common.bean.vo.sync.offline;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** 带复合游标的统一执行日志分页。 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OfflineExecutionLogPageVO {
  private List<OfflineExecutionLogEntryVO> items;
  private String nextCursor;
  private boolean completed;
  private boolean linkUpAvailable;
  private String warning;
}
