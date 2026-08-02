package io.yak.ops.business.sync.offline.worker;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Link-Up Worker 管理接口模型。
 *
 * @author weifuwan
 */
public final class OfflineWorkerModels {

  private OfflineWorkerModels() {
  }

  @Data
  @NoArgsConstructor
  public static class CreateRequest {

    private String nodeName;

    @NotBlank(message = "Worker 地址不能为空")
    private String baseUrl;

    @Min(value = 1, message = "调度权重不能小于 1")
    @Max(value = 1000, message = "调度权重不能大于 1000")
    private Integer weight = 100;

    private Map<String, String> labels;
  }

  @Data
  @NoArgsConstructor
  public static class UpdateRequest {

    private String nodeName;

    @NotBlank(message = "Worker 地址不能为空")
    private String baseUrl;

    @Min(value = 1, message = "调度权重不能小于 1")
    @Max(value = 1000, message = "调度权重不能大于 1000")
    private Integer weight = 100;

    private Map<String, String> labels;
  }

  @Data
  @NoArgsConstructor
  public static class VerifyRequest {

    @NotBlank(message = "Worker 地址不能为空")
    private String baseUrl;
  }

  @Data
  @NoArgsConstructor
  public static class QueryRequest {

    @Min(value = 1, message = "页码必须大于 0")
    private Integer pageNo = 1;

    @Min(value = 1, message = "每页数量必须大于 0")
    @Max(value = 500, message = "每页数量不能超过 500")
    private Integer pageSize = 20;

    private String keyword;
    private String status;
    private String schedulingStatus;
    private Boolean enabled;
  }

  @Data
  @NoArgsConstructor
  public static class SchedulingRequest {

    @NotBlank(message = "调度状态不能为空")
    @Pattern(
        regexp = "ENABLED|DRAINING|DISABLED",
        flags = Pattern.Flag.CASE_INSENSITIVE,
        message = "调度状态仅支持 ENABLED、DRAINING、DISABLED")
    private String schedulingStatus;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class WorkerView {

    private String nodeId;
    private String nodeName;
    private String baseUrl;
    private String registrationMode;
    private Boolean enabled;
    private String schedulingStatus;
    private Integer weight;
    private Map<String, String> labels;
    private String workerInstanceId;
    private String engineVersion;
    private String status;
    private Long startedAtMillis;
    private Boolean offlineOnly;
    private Integer maxConcurrentJobs;
    private Integer maxQueuedJobs;
    private Integer runningJobs;
    private Integer queuedJobs;
    private Integer activeJobs;
    private Boolean available;
    private Double loadRatio;
    private LocalDateTime lastHeartbeatTime;
    private LocalDateTime lastSuccessTime;
    private Integer consecutiveFailures;
    private String lastErrorMessage;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class PageView {

    private List<WorkerView> records;
    private Long total;
    private Integer pageNo;
    private Integer pageSize;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class OptionView {

    private String value;
    private String label;
    private String status;
    private String schedulingStatus;
    private Integer runningJobs;
    private Integer maxConcurrentJobs;
    private Integer queuedJobs;
    private Integer maxQueuedJobs;
    private Boolean available;
  }
}
