package io.yak.ops.common.bean.po.workflow;

import lombok.Data;
import lombok.EqualsAndHashCode;

/** 工作流实例与定义联表查询结果。 */
@Data
@EqualsAndHashCode(callSuper = true)
public class WorkflowInstanceDetailPO extends WorkflowInstancePO {
  private String workflowCode;
  private String workflowName;
}
