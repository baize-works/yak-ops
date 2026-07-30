package io.yak.ops.business.sync.realtime.model.response;

/** Savepoint 触发结果。 */
public record SavepointResult(String requestId, String location, String detail) {
}
