package org.apache.seatunnel.plugin.alarm.api;

/**
 * Alarm channel worker. A channel only knows how to <b>deliver</b> an alarm;
 * rule matching and scheduling live in the application layer.
 *
 * <p>
 * Mirrors DolphinScheduler's {@code AlertChannel#process(AlertInfo)}.
 * </p>
 */
public interface AlarmChannel {

    /**
     * Process and send the alarm.
     *
     * @param info alarm info (channel params + alarm data)
     * @return delivery result
     */
    AlarmResult process(AlarmInfo info);
}
