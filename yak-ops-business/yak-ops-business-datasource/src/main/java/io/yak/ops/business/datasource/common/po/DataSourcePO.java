package io.yak.ops.business.datasource.common.po;

import io.yak.ops.business.datasource.common.enums.DataSourceConnStatus;
import io.yak.ops.business.datasource.common.enums.DataSourceDbType;
import io.yak.ops.business.datasource.common.enums.DataSourceEnvironment;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.ToString;

/** 数据源持久化对象。 */
@Data
public class DataSourcePO {

  /** 主键。 */
  private Long id;

  /** 数据源名称。 */
  private String name;

  /** 数据库类型。 */
  private DataSourceDbType dbType;

  /** 展示和连接使用的 JDBC 地址。 */
  private String jdbcUrl;

  /** 运行环境。 */
  private DataSourceEnvironment environment;

  /** 连通状态。 */
  private DataSourceConnStatus connStatus;

  /** 备注。 */
  private String remark;

  /** 规范化后的连接参数。 */
  @ToString.Exclude
  private String connectionParams;

  /** 前端原始连接参数，用于编辑回显。 */
  @ToString.Exclude
  private String originalJson;

  /** 创建时间。 */
  private LocalDateTime createTime;

  /** 更新时间。 */
  private LocalDateTime updateTime;
}
