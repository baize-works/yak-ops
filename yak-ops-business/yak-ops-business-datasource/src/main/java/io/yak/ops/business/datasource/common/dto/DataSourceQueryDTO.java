package io.yak.ops.business.datasource.common.dto;

import io.yak.ops.business.datasource.common.constant.DataSourceConstants;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

/** 数据源分页查询数据传输对象。 */
@Data
public class DataSourceQueryDTO {

  /** 当前页码。 */
  @Min(value = 1, message = "页码必须大于 0")
  private int pageNo = DataSourceConstants.DEFAULT_PAGE_NO;

  /** 每页条数。 */
  @Min(value = 1, message = "每页条数必须大于 0")
  @Max(value = DataSourceConstants.MAX_PAGE_SIZE, message = "每页条数不能超过 200")
  private int pageSize = DataSourceConstants.DEFAULT_PAGE_SIZE;

  /** 数据源名称。 */
  private String name;

  /** 数据库类型。 */
  private String dbType;

  /** 运行环境。 */
  private String environment;
}
