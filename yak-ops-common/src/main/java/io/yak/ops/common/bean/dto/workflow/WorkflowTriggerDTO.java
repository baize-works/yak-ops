package io.yak.ops.common.bean.dto.workflow;

import java.util.LinkedHashMap;
import java.util.Map;
import lombok.Data;

/** 工作流运行参数。 */
@Data
public class WorkflowTriggerDTO {
  private Map<String, Object> globalParameters = new LinkedHashMap<>();
}
