package org.apache.seatunnel.plugin.alarm.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * The alarm payload, mirroring DolphinScheduler's {@code AlertData}.
 *
 * <p>
 * Kept minimal and domain-agnostic (title/content/log/severity) so alarm
 * plugins never depend on the job model. Job context is embedded in
 * {@code content} by the application layer.
 * </p>
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AlarmData {

    private Long id;

    private String title;

    private String content;

    private String log;

    private AlarmSeverity severity;
}
