package io.yak.ops.common.bean.dto.sync.offline;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import lombok.Data;

/**
 * 离线同步任务定义分页查询条件。
 *
 * @author weifuwan
 */
@Data
public class OfflineJobDefinitionQueryDTO {

  @JsonAlias("pageNo")
  @Min(value = 1, message = "页码必须大于 0")
  private int current = 1;

  @Min(value = 1, message = "每页条数必须大于 0")
  @Max(value = 200, message = "每页条数不能超过 200")
  private int pageSize = 10;

  private Long id;

  @Size(max = 128, message = "任务名称不能超过 128 个字符")
  private String jobName;

  private String status;
  private String sourceType;
  private String sinkType;
  private String sourceTable;
  private String sinkTable;

  @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
  private LocalDateTime createTimeStart;

  @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
  private LocalDateTime createTimeEnd;
}
