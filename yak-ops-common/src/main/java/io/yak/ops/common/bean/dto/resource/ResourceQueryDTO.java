package io.yak.ops.common.bean.dto.resource;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** 资源分页查询请求。 */
@Data
public class ResourceQueryDTO {

  @Min(value = 1, message = "页码必须大于 0")
  private int pageNo = 1;

  @Min(value = 1, message = "每页条数必须大于 0")
  @Max(value = 200, message = "每页条数不能超过 200")
  private int pageSize = 20;

  /** 父目录 ID；为空时查询全部资源。 */
  private Long parentId;

  @Size(max = 256, message = "搜索关键词不能超过 256 个字符")
  private String keyword;

  /** DIRECTORY 或 FILE。 */
  private String nodeType;
}
