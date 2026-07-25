package org.apache.seatunnel.plugin.alarm.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * The alarm information sent to a channel: the channel's config params plus the
 * alarm data. Mirrors DolphinScheduler's {@code AlertInfo}.
 *
 * <p>
 * Separating {@code alarmParams} (how to send) from {@code alarmData}
 * (what to send) keeps channels decoupled from the job domain.
 * </p>
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AlarmInfo {

    /**
     * Channel instance config params, parsed from the stored JSON into a
     * flat string map (nested values are kept as JSON strings), e.g.
     * {@code {"url":"https://...", "timeoutMs":"5000", "headers":"{...}"}}.
     */
    private Map<String, String> alarmParams;

    /**
     * The alarm payload.
     */
    private AlarmData alarmData;

    /**
     * Optional channel instance id, used for record linkage.
     */
    private Long alarmChannelId;
}
