package io.yak.ops.business.datasource.common.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** 未保存数据源连接测试参数。 */
@Data
public class DataSourceConnectTestDTO {

  /** 动态表单连接参数 JSON。 */
  @NotBlank(message = "connJson 不能为空")
  private String connJson;
}
