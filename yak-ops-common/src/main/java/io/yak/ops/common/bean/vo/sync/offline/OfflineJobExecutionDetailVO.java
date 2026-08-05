package io.yak.ops.common.bean.vo.sync.offline;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** 离线同步执行详情。 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OfflineJobExecutionDetailVO {
  /** 保留结构化执行对象，供强类型客户端使用。 */
  private OfflineJobExecutionVO execution;

  /**
   * 同时将执行实例字段展开到详情根节点，兼容现有页面按扁平实例读取指标的方式。
   */
  @JsonUnwrapped
  private OfflineJobExecutionVO summary;

  private JsonNode job;
  private JsonNode pipelines;
  private JsonNode tasks;
  private JsonNode metrics;
}
