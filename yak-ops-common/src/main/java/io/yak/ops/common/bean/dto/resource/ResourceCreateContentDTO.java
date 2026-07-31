package io.yak.ops.common.bean.dto.resource;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** 在线创建文本资源请求。 */
@Data
public class ResourceCreateContentDTO {

  /** 父目录 ID，根目录使用 0。 */
  private Long parentId = 0L;

  @NotBlank(message = "文件名称不能为空")
  @Size(max = 255, message = "文件名称不能超过 255 个字符")
  private String name;

  @NotNull(message = "文件内容不能为空")
  private String content;

  @Size(max = 255, message = "内容类型不能超过 255 个字符")
  private String contentType = "text/plain;charset=UTF-8";

  @Size(max = 512, message = "文件描述不能超过 512 个字符")
  private String description;
}
