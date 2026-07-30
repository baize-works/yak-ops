package io.yak.ops.common.bean.vo.sync.offline;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** 离线同步任务定义展示对象。 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OfflineJobDefinitionVO {

  private Long id;
  private String jobName;
  private String jobDesc;
  private String jobType;
  private String mode;
  private String releaseState;
  private String sourceType;
  private String sinkType;
  private Long sourceDatasourceId;
  private Long sinkDatasourceId;
  private String sourceDatasourceName;
  private String sinkDatasourceName;
  private String sourceTable;
  private String sinkTable;
  private String lastJobStatus;
  private String lastErrorMessage;
  private Long instanceId;
  private String engineJobId;
  private String runMode;
  private long duration;
  private long readRowCount;
  private double qps;
  private String syncSize;
  private String cronExpression;
  private String scheduleStatus;
  private String lastScheduleTime;
  private String nextScheduleTime;
  private String createTime;
  private String updateTime;
}
