package io.yak.ops.common.bean.vo.resource;

import lombok.Builder;
import lombok.Data;

/** 在线查看资源内容响应。 */
@Data
@Builder
public class ResourceContentVO {

  private Long resourceId;
  private String fullPath;
  private String content;
  private int skipLineNum;
  private int lineCount;
  private boolean hasMore;
}
