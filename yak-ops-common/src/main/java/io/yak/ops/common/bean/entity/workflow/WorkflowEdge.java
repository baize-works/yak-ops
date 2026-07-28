package io.yak.ops.common.bean.entity.workflow;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** 工作流 DAG 有向边。 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowEdge {
  private String from;
  private String to;
}
