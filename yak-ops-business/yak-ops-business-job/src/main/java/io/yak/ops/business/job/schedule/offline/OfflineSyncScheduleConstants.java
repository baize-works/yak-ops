package io.yak.ops.business.job.schedule.offline;

import io.yak.framework.schedule.api.ScheduleKey;

/**
 * 离线同步调度常量。
 */
public final class OfflineSyncScheduleConstants {

  public static final String NAMESPACE = "offline-sync";
  public static final String HANDLER_NAME = "offlineSyncScheduleHandler";
  public static final String PAYLOAD_DEFINITION_ID = "definitionId";

  private OfflineSyncScheduleConstants() {
  }

  public static ScheduleKey key(Long definitionId) {
    if (definitionId == null || definitionId <= 0L) {
      throw new IllegalArgumentException("definitionId must be positive");
    }
    return new ScheduleKey(NAMESPACE, "definition-" + definitionId);
  }
}
