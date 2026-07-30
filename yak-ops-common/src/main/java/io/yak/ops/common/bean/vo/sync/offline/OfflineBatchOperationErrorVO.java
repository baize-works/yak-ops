package io.yak.ops.common.bean.vo.sync.offline;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** 离线同步批量操作失败项。 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OfflineBatchOperationErrorVO {

  private Long jobDefinitionId;
  private String message;
}
