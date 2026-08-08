package io.yak.ops.business.workflow.model;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/** 工作流定义展示对象。 */
public record WorkflowDefinitionVO(
    String id,
    String name,
    String description,
    String status,
    int nodeCount,
    int edgeCount,
    List<WorkflowDefinitionUpdateRequest.NodeRequest> nodes,
    List<WorkflowDefinitionUpdateRequest.EdgeRequest> edges,
    Map<String, Object> input,
    long workflowTimeoutSeconds,
    String failureStrategy,
    String latestExecutionId,
    String latestExecutionStatus,
    Instant createTime,
    Instant updateTime) {}
