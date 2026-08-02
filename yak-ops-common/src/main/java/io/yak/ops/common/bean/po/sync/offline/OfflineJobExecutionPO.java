package io.yak.ops.common.bean.po.sync.offline;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.ToString;

/**
 * 离线同步执行历史；Yak Ops 以该记录为状态事实来源。
 *
 * @author weifuwan
 */
@Data
@TableName("yak_offline_job_execution")
public class OfflineJobExecutionPO {

  @TableId(type = IdType.AUTO)
  private Long id;
  private Long jobDefinitionId;
  private Long definitionVersionId;
  private Integer definitionVersion;
  private String engineNodeId;
  private String engineNodeBaseUrl;
  private String engineJobId;
  private String externalExecutionId;
  private String idempotencyKey;
  private String workerInstanceId;
  private String assignmentMode;
  private Double assignmentScore;
  private String assignmentReason;

  @ToString.Exclude
  private String assignmentCandidatesJson;

  /** 本次执行所依据的任务 Connector 能力要求。 */
  @ToString.Exclude
  private String requiredCapabilitiesJson;

  /** 分配时 Worker 实际匹配的 Connector 能力快照。 */
  @ToString.Exclude
  private String assignedCapabilitiesJson;

  /** Worker 预热时生成的 Source/Sink options 摘要要求，不包含凭据明文。 */
  @ToString.Exclude
  private String reachabilityRequirementsJson;

  /** 分配时命中的 Worker 视角可达性预检证据。 */
  @ToString.Exclude
  private String assignedReachabilityJson;

  private String status;
  private Long stateVersion;
  private Integer attemptNo;
  private String triggerType;
  private Long retryFromExecutionId;
  private Boolean cancellationRequested;
  private Boolean retryCreated;
  private LocalDateTime nextRetryTime;
  private String configDigest;

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
  private LocalDateTime lastSyncTime;
  private LocalDateTime updateTime;
}
