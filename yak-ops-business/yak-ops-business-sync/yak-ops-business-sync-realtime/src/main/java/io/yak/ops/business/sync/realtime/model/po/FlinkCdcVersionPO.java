package io.yak.ops.business.sync.realtime.model.po;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.util.Date;
import lombok.Data;

/** Flink CDC 发行版本记录。 */
@Data
@TableName("yak_rt_cdc_version")
public class FlinkCdcVersionPO {
  @TableId(type = IdType.AUTO)
  private Long id;
  private String version;
  private String displayName;
  private String flinkMinVersion;
  private String flinkMaxVersion;
  private String cdcHome;
  private String connectorDirectory;
  private String description;
  private Boolean enabled;
  private Boolean defaultVersion;
  private Date createdAt;
  private Date updatedAt;
}
