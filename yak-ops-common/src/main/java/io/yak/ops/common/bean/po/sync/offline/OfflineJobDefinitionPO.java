package io.yak.ops.common.bean.po.sync.offline;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.ToString;

/** 离线同步任务定义持久化对象。 */
@Data
@TableName("yak_offline_job_definition")
public class OfflineJobDefinitionPO {

  @TableId(type = IdType.INPUT)
  private Long id;
  private String jobName;

  @TableField(updateStrategy = FieldStrategy.ALWAYS)
  private String jobDesc;

  private String mode;

  @ToString.Exclude
  private String definitionJson;

  @ToString.Exclude
  private String hoconConfig;

  private String releaseState;

  @TableField(updateStrategy = FieldStrategy.ALWAYS)
  private String sourceType;

  @TableField(updateStrategy = FieldStrategy.ALWAYS)
  private String sinkType;

  @TableField(updateStrategy = FieldStrategy.ALWAYS)
  private Long sourceDatasourceId;

  @TableField(updateStrategy = FieldStrategy.ALWAYS)
  private Long sinkDatasourceId;

  @TableField(updateStrategy = FieldStrategy.ALWAYS)
  private String sourceTable;

  @TableField(updateStrategy = FieldStrategy.ALWAYS)
  private String sinkTable;

  @ToString.Exclude
  @TableField(updateStrategy = FieldStrategy.ALWAYS)
  private String scheduleJson;

  @ToString.Exclude
  @TableField(updateStrategy = FieldStrategy.ALWAYS)
  private String envJson;

  private Integer version;
  private Long lastExecutionId;
  private String lastEngineJobId;
  private String lastJobStatus;

  @TableField(updateStrategy = FieldStrategy.ALWAYS)
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
