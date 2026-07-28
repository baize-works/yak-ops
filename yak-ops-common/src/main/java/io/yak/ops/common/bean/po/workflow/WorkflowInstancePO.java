package io.yak.ops.common.bean.po.workflow;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.util.Date;
import lombok.Data;

/** 工作流实例持久化对象。 */
@Data
@TableName("yak_wf_instance")
public class WorkflowInstancePO {
  @TableId(type = IdType.AUTO)
  private Long id;
  private Long workflowId;
  private Integer workflowVersion;
  private String triggerType;
  private String state;
  private String globalParamsJson;
  private String failureStrategy;
  private Integer maxParallelism;
  private Boolean stopRequested;
  private Date startTime;
  private Date endTime;
  private String createdBy;
  private Date createdAt;
  private Integer lockVersion;
}
