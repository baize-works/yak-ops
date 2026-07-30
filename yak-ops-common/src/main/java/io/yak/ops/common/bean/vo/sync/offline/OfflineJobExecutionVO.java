package io.yak.ops.common.bean.vo.sync.offline;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** 离线同步任务实例展示对象。 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OfflineJobExecutionVO {

  private Long id;
  private Long jobDefinitionId;
  private String engineJobId;
  private String status;
  private String errorMessage;
  private long sourceRecordCount;
  private long sinkSuccessRecordCount;
  private long sourceReadBytes;
  private long sinkWrittenBytes;
  private double qps;
  private long durationMillis;
  private String createTime;
  private String startTime;
  private String endTime;
  private String updateTime;
}
