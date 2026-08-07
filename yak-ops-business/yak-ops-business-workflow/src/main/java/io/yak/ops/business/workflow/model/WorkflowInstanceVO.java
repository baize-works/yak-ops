package io.yak.ops.business.workflow.model;

import java.time.Instant;
import java.util.List;

public record WorkflowInstanceVO(
    String id,
    String definitionId,
    String name,
    String status,
    Instant startedAt,
    Instant endedAt,
    int nodeCount,
    int edgeCount,
    List<NodeInstanceVO> nodes) {

  public record NodeInstanceVO(
      String id,
      String name,
      String type,
      String status,
      String errorMessage) {}
}
