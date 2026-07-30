package io.yak.ops.business.sync.offline.model.po;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.ToString;

/** 离线同步任务定义。 */
@Data
@TableName("yak_offline_job_definition")
public class OfflineJobDefinitionPO {

  @TableId(type = IdType.INPUT)
  private Long id;
  private String jobName;
  private String jobDesc;
  private String mode;

  @ToString.Exclude
  private String definitionJson;

  @ToString.Exclude
  private String hoconConfig;

  private String releaseState;
  private String sourceType;
  private String sinkType;
  private Long sourceDatasourceId;
  private Long sinkDatasourceId;
  private String sourceTable;
  private String sinkTable;

  @ToString.Exclude
  private String scheduleJson;

  @ToString.Exclude
  private String envJson;

  private Integer version;
  private Long lastExecutionId;
  private String lastEngineJobId;
  private String lastJobStatus;
  private String lastErrorMessage;
  private Long lastDurationMillis;
  private Long lastReadRowCount;
  private Double lastQps;
  private Long lastSyncBytes;
  private LocalDateTime lastStartTime;
  private LocalDateTime lastEndTime;
  private LocalDateTime createTime;
  private LocalDateTime updateTime;
}
