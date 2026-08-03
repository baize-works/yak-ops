package io.yak.ops.common.bean.vo.resource;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.Builder;
import lombok.Data;

/** 在线查看资源内容响应。 */
@Data
@Builder
public class ResourceContentVO {

  @JsonSerialize(using = ToStringSerializer.class)
  private Long resourceId;
  private String fullPath;
  private String content;
  private int skipLineNum;
  private int lineCount;
  private boolean hasMore;
}
