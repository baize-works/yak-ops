package io.yak.ops.business.sync.realtime.model.po;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.util.Date;
import lombok.Data;

/** 实时同步运行环境。 */
@Data
@TableName("yak_rt_environment")
public class RealtimeEnvironmentPO {
  @TableId(type = IdType.AUTO)
  private Long id;
  private String name;
  private String deploymentMode;
  private String flinkVersion;
  private Long cdcVersionId;
  private String flinkHome;
  private String restAddress;
  private String clusterId;
  private String namespace;
  private String deploymentConfigJson;
  private Boolean enabled;
  private Date createdAt;
  private Date updatedAt;
}
