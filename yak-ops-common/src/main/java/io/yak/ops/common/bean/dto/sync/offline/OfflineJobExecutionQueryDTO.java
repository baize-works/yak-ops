package io.yak.ops.common.bean.dto.sync.offline;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

/**
 * 离线同步任务实例分页查询条件。
 *
 * @author weifuwan
 */
@Data
public class OfflineJobExecutionQueryDTO {

  @JsonAlias("pageNo")
  @Min(value = 1, message = "页码必须大于 0")
  private int current = 1;

  @Min(value = 1, message = "每页条数必须大于 0")
  @Max(value = 200, message = "每页条数不能超过 200")
  private int pageSize = 10;

  private Long jobDefinitionId;
  private String status;
}
