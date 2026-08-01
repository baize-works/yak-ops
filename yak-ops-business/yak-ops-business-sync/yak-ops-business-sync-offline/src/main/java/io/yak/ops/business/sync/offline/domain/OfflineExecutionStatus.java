package io.yak.ops.business.sync.offline.domain;

import java.util.EnumSet;
import java.util.Locale;
import java.util.Set;

/** Yak Ops 对 Link-Up 离线作业状态的稳定映射。 */
public enum OfflineExecutionStatus {
  CREATED,
  SUBMITTED,
  QUEUED,
  RUNNING,
  SUCCEEDED,
  FAILED,
  CANCELED,
  LOST;

  private static final Set<OfflineExecutionStatus> ACTIVE =
      EnumSet.of(CREATED, SUBMITTED, QUEUED, RUNNING);

  public boolean isActive() {
    return ACTIVE.contains(this);
  }

  public boolean isTerminal() {
    return !isActive();
  }

  public static OfflineExecutionStatus parse(String value) {
    if (value == null || value.trim().isEmpty()) {
      return CREATED;
    }
    String normalized = value.trim().toUpperCase(Locale.ROOT);
    if ("FINISHED".equals(normalized) || "COMPLETED".equals(normalized)) {
      return SUCCEEDED;
    }
    if ("CANCELLED".equals(normalized) || "CANCELING".equals(normalized)
        || "CANCELLING".equals(normalized)) {
      return CANCELED;
    }
    return valueOf(normalized);
  }

  public static boolean isActive(String value) {
    try {
      return parse(value).isActive();
    } catch (IllegalArgumentException exception) {
      return false;
    }
  }
}
