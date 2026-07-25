package org.apache.seatunnel.plugin.alarm.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Result of an alarm delivery attempt, mirroring DolphinScheduler's
 * {@code AlertResult}.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AlarmResult {

    private boolean success;

    private String message;

    public static AlarmResult success() {
        return new AlarmResult(true, null);
    }

    public static AlarmResult success(String message) {
        return new AlarmResult(true, message);
    }

    public static AlarmResult fail(String message) {
        return new AlarmResult(false, message);
    }
}
