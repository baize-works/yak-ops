package io.yak.ops.common.bean.po.sync.offline;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.ToString;

/** 离线同步当前任务定义。 */
@Data
@TableName("yak_offline_job_definition")
public class OfflineJobDefinitionPO {
  @TableId(type = IdType.INPUT)
  private Long id;
  private String jobName;
  @TableField(updateStrategy = FieldStrategy.ALWAYS) private String jobDesc;
  private String mode;
  @ToString.Exclude private String definitionJson;
  @ToString.Exclude @TableField(updateStrategy = FieldStrategy.ALWAYS) private String jobSpecJson;
  @TableField(updateStrategy = FieldStrategy.ALWAYS) private String configDigest;
  private String releaseState;
  @TableField(updateStrategy = FieldStrategy.ALWAYS) private String sourceType;
  @TableField(updateStrategy = FieldStrategy.ALWAYS) private String sinkType;
  @TableField(updateStrategy = FieldStrategy.ALWAYS) private Long sourceDatasourceId;
  @TableField(updateStrategy = FieldStrategy.ALWAYS) private Long sinkDatasourceId;
  @TableField(updateStrategy = FieldStrategy.ALWAYS) private String sourceTable;
  @TableField(updateStrategy = FieldStrategy.ALWAYS) private String sinkTable;
  @ToString.Exclude @TableField(updateStrategy = FieldStrategy.ALWAYS) private String scheduleJson;
  private Boolean scheduleEnabled;
  @TableField(updateStrategy = FieldStrategy.ALWAYS) private String cronExpression;
  private Integer retryMaxAttempts;
  private Integer retryBackoffSeconds;
  @TableField(updateStrategy = FieldStrategy.ALWAYS) private LocalDateTime scheduleLastFireTime;
  @TableField(updateStrategy = FieldStrategy.ALWAYS) private LocalDateTime scheduleNextFireTime;
  private Integer version;
  @TableField(updateStrategy = FieldStrategy.ALWAYS) private Long lastExecutionId;
  @TableField(updateStrategy = FieldStrategy.ALWAYS) private String lastEngineJobId;
  @TableField(updateStrategy = FieldStrategy.ALWAYS) private String lastJobStatus;
  @TableField(updateStrategy = FieldStrategy.ALWAYS) private String lastErrorMessage;
  @TableField(updateStrategy = FieldStrategy.ALWAYS) private Long lastDurationMillis;
  @TableField(updateStrategy = FieldStrategy.ALWAYS) private Long lastReadRowCount;
  @TableField(updateStrategy = FieldStrategy.ALWAYS) private Double lastQps;
  @TableField(updateStrategy = FieldStrategy.ALWAYS) private Long lastSyncBytes;
  @TableField(updateStrategy = FieldStrategy.ALWAYS) private LocalDateTime lastStartTime;
  @TableField(updateStrategy = FieldStrategy.ALWAYS) private LocalDateTime lastEndTime;
  private LocalDateTime createTime;
  private LocalDateTime updateTime;
}
