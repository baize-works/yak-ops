package io.yak.ops.business.sync.realtime.deployment;

import lombok.Value;

/** 外部命令执行结果。 */
@Value
public class CommandResult {
  int exitCode;
  String output;
}
