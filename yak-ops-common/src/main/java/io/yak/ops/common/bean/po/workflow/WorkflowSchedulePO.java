package io.yak.ops.common.bean.po.workflow;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.util.Date;
import lombok.Data;

/** 工作流调度持久化对象。 */
@Data
@TableName("yak_wf_schedule")
public class WorkflowSchedulePO {
  @TableId(type = IdType.AUTO)
  private Long id;
  private Long workflowId;
  private String cronExpression;
  private String timezone;
  private Boolean enabled;
  private String misfirePolicy;
  private String concurrencyPolicy;
  private Date updatedAt;
}
