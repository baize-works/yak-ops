package io.yak.ops.common.bean.po.workflow;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.util.Date;
import lombok.Data;

/** 工作流定义持久化对象。 */
@Data
@TableName("yak_wf_definition")
public class WorkflowDefinitionPO {
  @TableId(type = IdType.AUTO)
  private Long id;
  private String code;
  private String name;
  private String description;
  private String state;
  private Integer currentVersion;
  private String failureStrategy;
  private Integer maxParallelism;
  private Integer draftSchemaVersion;
  private String draftJson;
  private String createdBy;
  private Date createdAt;
  private Date updatedAt;
}
