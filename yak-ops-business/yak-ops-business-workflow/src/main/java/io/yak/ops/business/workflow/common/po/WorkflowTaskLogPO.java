package io.yak.ops.business.workflow.common.po;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.util.Date;
import lombok.Data;

/** 工作流任务日志持久化对象。 */
@Data
@TableName("yak_wf_task_log")
public class WorkflowTaskLogPO {
  @TableId(type = IdType.AUTO)
  private Long id;
  private Long taskAttemptId;
  private Long lineNo;
  private String content;
  private Date createdAt;
}
