package io.yak.ops.business.workflow.common.po;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.util.Date;
import lombok.Data;

/** 工作流发布版本持久化对象。 */
@Data
@TableName("yak_wf_version")
public class WorkflowVersionPO {
  @TableId(type = IdType.AUTO)
  private Long id;
  private Long workflowId;
  private Integer version;
  private String dagJson;
  private String contentHash;
  private String publishedBy;
  private Date publishedAt;
}
