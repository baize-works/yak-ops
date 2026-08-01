package io.yak.ops.common.bean.dto.sync.offline;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import lombok.Data;

/**
 * 离线同步批量执行或停止入参。
 *
 * @author weifuwan
 */
@Data
public class OfflineBatchOperationDTO {

  @NotEmpty(message = "jobDefinitionIds 不能为空")
  private List<Long> jobDefinitionIds;
}
