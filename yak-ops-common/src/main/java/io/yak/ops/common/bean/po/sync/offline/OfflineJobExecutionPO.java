package io.yak.ops.common.bean.po.sync.offline;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.ToString;

/** 离线同步任务执行记录持久化对象。 */
@Data
@TableName("yak_offline_job_execution")
public class OfflineJobExecutionPO {

  @TableId(type = IdType.AUTO)
  private Long id;
  private Long jobDefinitionId;
  private String engineJobId;
  private String status;

  @ToString.Exclude
  private String submittedConfig;

  @ToString.Exclude
  private String engineSnapshotJson;

  private String errorMessage;
  private Long sourceRecordCount;
  private Long sinkSuccessRecordCount;
  private Long sourceReadBytes;
  private Long sinkWrittenBytes;
  private Double qps;
  private Long durationMillis;
  private LocalDateTime createTime;
  private LocalDateTime startTime;
  private LocalDateTime endTime;
  private LocalDateTime updateTime;
}
