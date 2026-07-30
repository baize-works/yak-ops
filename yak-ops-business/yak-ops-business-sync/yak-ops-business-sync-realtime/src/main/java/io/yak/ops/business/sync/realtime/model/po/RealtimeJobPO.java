package io.yak.ops.business.sync.realtime.model.po;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.util.Date;
import lombok.Data;

/** 实时同步任务定义。 */
@Data
@TableName("yak_rt_job")
public class RealtimeJobPO {
  @TableId(type = IdType.AUTO)
  private Long id;
  private String name;
  private String description;
  private Long environmentId;
  private Long cdcVersionId;
  private String pipelineYaml;
  private String runtimeOptionsJson;
  private String state;
  private Long currentDeploymentId;
  private Date createdAt;
  private Date updatedAt;
}
