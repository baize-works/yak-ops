package io.yak.ops.common.bean.vo.sync.offline;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 离线同步批量操作结果。
 *
 * @author weifuwan
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OfflineBatchOperationVO {

  private int successCount;
  private int failedCount;
  private List<OfflineBatchOperationErrorVO> errors;
}
