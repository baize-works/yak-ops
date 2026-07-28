package io.yak.ops.common.bean.dto.datasource;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** 未保存数据源连接测试参数。 */
@Data
public class DataSourceConnectTestDTO {

  /** 可选的数据源类型；未提供时从 connJson 的 dbType/type/pluginType 路由。 */
  private String dbType;

  /** 动态表单连接参数 JSON。 */
  @NotBlank(message = "connJson 不能为空")
  private String connJson;
}
