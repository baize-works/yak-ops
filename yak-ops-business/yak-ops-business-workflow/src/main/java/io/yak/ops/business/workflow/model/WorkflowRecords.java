package io.yak.ops.business.workflow.model;

import io.yak.ops.business.workflow.model.WorkflowEnums.AttemptState;
import io.yak.ops.business.workflow.model.WorkflowEnums.DefinitionState;
import io.yak.ops.business.workflow.model.WorkflowEnums.FailureStrategy;
import io.yak.ops.business.workflow.model.WorkflowEnums.MisfirePolicy;
import io.yak.ops.business.workflow.model.WorkflowEnums.ScheduleConcurrencyPolicy;
import io.yak.ops.business.workflow.model.WorkflowEnums.TaskState;
import io.yak.ops.business.workflow.model.WorkflowEnums.TriggerType;
import io.yak.ops.business.workflow.model.WorkflowEnums.WorkflowState;
import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/** Immutable data models returned by the workflow repository and REST layer. */
public final class WorkflowRecords {

  private WorkflowRecords() {
  }

  public static final class Definition {

    private final long id;
    private final String code;
    private final String name;
    private final String description;
    private final DefinitionState state;
    private final Integer currentVersion;
    private final FailureStrategy failureStrategy;
    private final int maxParallelism;
    private final WorkflowDag draft;
    private final String createdBy;
    private final Instant createdAt;
    private final Instant updatedAt;

    public Definition(
        long id,
        String code,
        String name,
        String description,
        DefinitionState state,
        Integer currentVersion,
        FailureStrategy failureStrategy,
        int maxParallelism,
        WorkflowDag draft,
        String createdBy,
        Instant createdAt,
        Instant updatedAt) {
      this.id = id;
      this.code = code;
      this.name = name;
      this.description = description;
      this.state = state;
      this.currentVersion = currentVersion;
      this.failureStrategy = failureStrategy;
      this.maxParallelism = maxParallelism;
      this.draft = draft;
      this.createdBy = createdBy;
      this.createdAt = createdAt;
      this.updatedAt = updatedAt;
    }

    public long id() { return id; }
    public long getId() { return id; }
    public String code() { return code; }
    public String getCode() { return code; }
    public String name() { return name; }
    public String getName() { return name; }
    public String description() { return description; }
    public String getDescription() { return description; }
    public DefinitionState state() { return state; }
    public DefinitionState getState() { return state; }
    public Integer currentVersion() { return currentVersion; }
    public Integer getCurrentVersion() { return currentVersion; }
    public FailureStrategy failureStrategy() { return failureStrategy; }
    public FailureStrategy getFailureStrategy() { return failureStrategy; }
    public int maxParallelism() { return maxParallelism; }
    public int getMaxParallelism() { return maxParallelism; }
    public WorkflowDag draft() { return draft; }
    public WorkflowDag getDraft() { return draft; }
    public String createdBy() { return createdBy; }
    public String getCreatedBy() { return createdBy; }
    public Instant createdAt() { return createdAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant updatedAt() { return updatedAt; }
    public Instant getUpdatedAt() { return updatedAt; }
  }

  public static final class Version {

    private final long id;
    private final long workflowId;
    private final int version;
    private final WorkflowDag dag;
    private final String contentHash;
    private final String publishedBy;
    private final Instant publishedAt;

    public Version(
        long id,
        long workflowId,
        int version,
        WorkflowDag dag,
        String contentHash,
        String publishedBy,
        Instant publishedAt) {
      this.id = id;
      this.workflowId = workflowId;
      this.version = version;
      this.dag = dag;
      this.contentHash = contentHash;
      this.publishedBy = publishedBy;
      this.publishedAt = publishedAt;
    }

    public long id() { return id; }
    public long getId() { return id; }
    public long workflowId() { return workflowId; }
    public long getWorkflowId() { return workflowId; }
    public int version() { return version; }
    public int getVersion() { return version; }
    public WorkflowDag dag() { return dag; }
    public WorkflowDag getDag() { return dag; }
    public String contentHash() { return contentHash; }
    public String getContentHash() { return contentHash; }
    public String publishedBy() { return publishedBy; }
    public String getPublishedBy() { return publishedBy; }
    public Instant publishedAt() { return publishedAt; }
    public Instant getPublishedAt() { return publishedAt; }
  }

  public static final class Instance {

    private final long id;
    private final long workflowId;
    private final int workflowVersion;
    private final TriggerType triggerType;
    private final WorkflowState state;
    private final Map<String, Object> globalParameters;
    private final FailureStrategy failureStrategy;
    private final int maxParallelism;
    private final boolean stopRequested;
    private final Instant startTime;
    private final Instant endTime;
    private final String createdBy;
    private final Instant createdAt;

    public Instance(
        long id,
        long workflowId,
        int workflowVersion,
        TriggerType triggerType,
        WorkflowState state,
        Map<String, Object> globalParameters,
        FailureStrategy failureStrategy,
        int maxParallelism,
        boolean stopRequested,
        Instant startTime,
        Instant endTime,
        String createdBy,
        Instant createdAt) {
      this.id = id;
      this.workflowId = workflowId;
      this.workflowVersion = workflowVersion;
      this.triggerType = triggerType;
      this.state = state;
      this.globalParameters = immutableMap(globalParameters);
      this.failureStrategy = failureStrategy;
      this.maxParallelism = maxParallelism;
      this.stopRequested = stopRequested;
      this.startTime = startTime;
      this.endTime = endTime;
      this.createdBy = createdBy;
      this.createdAt = createdAt;
    }

    public long id() { return id; }
    public long getId() { return id; }
    public long workflowId() { return workflowId; }
    public long getWorkflowId() { return workflowId; }
    public int workflowVersion() { return workflowVersion; }
    public int getWorkflowVersion() { return workflowVersion; }
    public TriggerType triggerType() { return triggerType; }
    public TriggerType getTriggerType() { return triggerType; }
    public WorkflowState state() { return state; }
    public WorkflowState getState() { return state; }
    public Map<String, Object> globalParameters() { return globalParameters; }
    public Map<String, Object> getGlobalParameters() { return globalParameters; }
    public FailureStrategy failureStrategy() { return failureStrategy; }
    public FailureStrategy getFailureStrategy() { return failureStrategy; }
    public int maxParallelism() { return maxParallelism; }
    public int getMaxParallelism() { return maxParallelism; }
    public boolean stopRequested() { return stopRequested; }
    public boolean isStopRequested() { return stopRequested; }
    public Instant startTime() { return startTime; }
    public Instant getStartTime() { return startTime; }
    public Instant endTime() { return endTime; }
    public Instant getEndTime() { return endTime; }
    public String createdBy() { return createdBy; }
    public String getCreatedBy() { return createdBy; }
    public Instant createdAt() { return createdAt; }
    public Instant getCreatedAt() { return createdAt; }
  }

  public static final class TaskInstance {

    private final long id;
    private final long workflowInstanceId;
    private final String nodeKey;
    private final String nodeName;
    private final String taskType;
    private final TaskState state;
    private final Map<String, Object> configuration;
    private final int maxRetryTimes;
    private final int retryCount;
    private final int retryIntervalSeconds;
    private final int timeoutSeconds;
    private final boolean idempotent;
    private final boolean retryOnRestart;
    private final Instant nextRetryTime;
    private final Instant startTime;
    private final Instant endTime;
    private final Map<String, Object> resultData;
    private final String errorMessage;

    public TaskInstance(
        long id,
        long workflowInstanceId,
        String nodeKey,
        String nodeName,
        String taskType,
        TaskState state,
        Map<String, Object> configuration,
        int maxRetryTimes,
        int retryCount,
        int retryIntervalSeconds,
        int timeoutSeconds,
        boolean idempotent,
        boolean retryOnRestart,
        Instant nextRetryTime,
        Instant startTime,
        Instant endTime,
        Map<String, Object> resultData,
        String errorMessage) {
      this.id = id;
      this.workflowInstanceId = workflowInstanceId;
      this.nodeKey = nodeKey;
      this.nodeName = nodeName;
      this.taskType = taskType;
      this.state = state;
      this.configuration = immutableMap(configuration);
      this.maxRetryTimes = maxRetryTimes;
      this.retryCount = retryCount;
      this.retryIntervalSeconds = retryIntervalSeconds;
      this.timeoutSeconds = timeoutSeconds;
      this.idempotent = idempotent;
      this.retryOnRestart = retryOnRestart;
      this.nextRetryTime = nextRetryTime;
      this.startTime = startTime;
      this.endTime = endTime;
      this.resultData = immutableMap(resultData);
      this.errorMessage = errorMessage;
    }

    public long id() { return id; }
    public long getId() { return id; }
    public long workflowInstanceId() { return workflowInstanceId; }
    public long getWorkflowInstanceId() { return workflowInstanceId; }
    public String nodeKey() { return nodeKey; }
    public String getNodeKey() { return nodeKey; }
    public String nodeName() { return nodeName; }
    public String getNodeName() { return nodeName; }
    public String taskType() { return taskType; }
    public String getTaskType() { return taskType; }
    public TaskState state() { return state; }
    public TaskState getState() { return state; }
    public Map<String, Object> configuration() { return configuration; }
    public Map<String, Object> getConfiguration() { return configuration; }
    public int maxRetryTimes() { return maxRetryTimes; }
    public int getMaxRetryTimes() { return maxRetryTimes; }
    public int retryCount() { return retryCount; }
    public int getRetryCount() { return retryCount; }
    public int retryIntervalSeconds() { return retryIntervalSeconds; }
    public int getRetryIntervalSeconds() { return retryIntervalSeconds; }
    public int timeoutSeconds() { return timeoutSeconds; }
    public int getTimeoutSeconds() { return timeoutSeconds; }
    public boolean idempotent() { return idempotent; }
    public boolean isIdempotent() { return idempotent; }
    public boolean retryOnRestart() { return retryOnRestart; }
    public boolean isRetryOnRestart() { return retryOnRestart; }
    public Instant nextRetryTime() { return nextRetryTime; }
    public Instant getNextRetryTime() { return nextRetryTime; }
    public Instant startTime() { return startTime; }
    public Instant getStartTime() { return startTime; }
    public Instant endTime() { return endTime; }
    public Instant getEndTime() { return endTime; }
    public Map<String, Object> resultData() { return resultData; }
    public Map<String, Object> getResultData() { return resultData; }
    public String errorMessage() { return errorMessage; }
    public String getErrorMessage() { return errorMessage; }
  }

  public static final class Attempt {

    private final long id;
    private final long taskInstanceId;
    private final int attemptNo;
    private final AttemptState state;
    private final String executorType;
    private final String externalId;
    private final Instant startTime;
    private final Instant endTime;
    private final String errorMessage;

    public Attempt(
        long id,
        long taskInstanceId,
        int attemptNo,
        AttemptState state,
        String executorType,
        String externalId,
        Instant startTime,
        Instant endTime,
        String errorMessage) {
      this.id = id;
      this.taskInstanceId = taskInstanceId;
      this.attemptNo = attemptNo;
      this.state = state;
      this.executorType = executorType;
      this.externalId = externalId;
      this.startTime = startTime;
      this.endTime = endTime;
      this.errorMessage = errorMessage;
    }

    public long id() { return id; }
    public long getId() { return id; }
    public long taskInstanceId() { return taskInstanceId; }
    public long getTaskInstanceId() { return taskInstanceId; }
    public int attemptNo() { return attemptNo; }
    public int getAttemptNo() { return attemptNo; }
    public AttemptState state() { return state; }
    public AttemptState getState() { return state; }
    public String executorType() { return executorType; }
    public String getExecutorType() { return executorType; }
    public String externalId() { return externalId; }
    public String getExternalId() { return externalId; }
    public Instant startTime() { return startTime; }
    public Instant getStartTime() { return startTime; }
    public Instant endTime() { return endTime; }
    public Instant getEndTime() { return endTime; }
    public String errorMessage() { return errorMessage; }
    public String getErrorMessage() { return errorMessage; }
  }

  public static final class Schedule {

    private final long id;
    private final long workflowId;
    private final String cronExpression;
    private final String timezone;
    private final boolean enabled;
    private final MisfirePolicy misfirePolicy;
    private final ScheduleConcurrencyPolicy concurrencyPolicy;
    private final Instant updatedAt;

    public Schedule(
        long id,
        long workflowId,
        String cronExpression,
        String timezone,
        boolean enabled,
        MisfirePolicy misfirePolicy,
        ScheduleConcurrencyPolicy concurrencyPolicy,
        Instant updatedAt) {
      this.id = id;
      this.workflowId = workflowId;
      this.cronExpression = cronExpression;
      this.timezone = timezone;
      this.enabled = enabled;
      this.misfirePolicy = misfirePolicy;
      this.concurrencyPolicy = concurrencyPolicy;
      this.updatedAt = updatedAt;
    }

    public long id() { return id; }
    public long getId() { return id; }
    public long workflowId() { return workflowId; }
    public long getWorkflowId() { return workflowId; }
    public String cronExpression() { return cronExpression; }
    public String getCronExpression() { return cronExpression; }
    public String timezone() { return timezone; }
    public String getTimezone() { return timezone; }
    public boolean enabled() { return enabled; }
    public boolean isEnabled() { return enabled; }
    public MisfirePolicy misfirePolicy() { return misfirePolicy; }
    public MisfirePolicy getMisfirePolicy() { return misfirePolicy; }
    public ScheduleConcurrencyPolicy concurrencyPolicy() { return concurrencyPolicy; }
    public ScheduleConcurrencyPolicy getConcurrencyPolicy() { return concurrencyPolicy; }
    public Instant updatedAt() { return updatedAt; }
    public Instant getUpdatedAt() { return updatedAt; }
  }

  private static Map<String, Object> immutableMap(Map<String, Object> source) {
    if (source == null || source.isEmpty()) {
      return Map.of();
    }
    return Collections.unmodifiableMap(new LinkedHashMap<>(source));
  }
}
