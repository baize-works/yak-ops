package io.yak.ops.business.sync.realtime.model.request;

import lombok.Data;

/** 触发 Savepoint 参数。 */
@Data
public class SavepointRequest {
  private String targetDirectory;
}
