package io.yak.ops.common.bean.entity.workflow;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** 工作流设计器视口信息。 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowViewport {

  private double x;
  private double y;
  private double zoom = 1D;
}
