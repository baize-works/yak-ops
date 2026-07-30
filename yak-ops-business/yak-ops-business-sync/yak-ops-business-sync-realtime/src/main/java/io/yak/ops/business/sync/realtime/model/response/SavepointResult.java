package io.yak.ops.business.sync.realtime.model.response;

import lombok.Value;

/** Savepoint 触发结果。 */
@Value
public class SavepointResult {
  String requestId;
  String location;
  String detail;
}
