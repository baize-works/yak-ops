package io.yak.ops.common.bean.vo.sync.offline;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** 离线同步任务实例详情。 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OfflineJobExecutionDetailVO {

  private OfflineJobExecutionVO execution;
  private JsonNode job;
  private JsonNode pipelines;
  private JsonNode tasks;
  private JsonNode metrics;
}
