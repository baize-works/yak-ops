package io.yak.ops.business.sync.realtime.model.po;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.util.Date;
import lombok.Data;

/** 实时同步任务部署记录。 */
@Data
@TableName("yak_rt_deployment")
public class RealtimeDeploymentPO {
  @TableId(type = IdType.AUTO)
  private Long id;
  private Long jobId;
  private Long environmentId;
  private Long cdcVersionId;
  private String deploymentMode;
  private String state;
  private String externalId;
  private String commandJson;
  private String manifestPath;
  private String output;
  private String errorMessage;
  private String savepointPath;
  private Date submittedAt;
  private Date finishedAt;
  private Date createdAt;
  private Date updatedAt;
}
