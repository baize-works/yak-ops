package io.yak.ops.business.datasource.common.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** 数据源下拉选项。 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DataSourceOptionVO {

  private String label;
  private String value;
  private String dbType;
}
