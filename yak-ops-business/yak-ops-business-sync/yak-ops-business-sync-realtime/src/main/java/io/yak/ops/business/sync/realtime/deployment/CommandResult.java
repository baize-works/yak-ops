package io.yak.ops.business.sync.realtime.deployment;

/** 外部命令执行结果。 */
public record CommandResult(int exitCode, String output) {
}
