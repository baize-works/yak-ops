package io.yak.ops.infrastructure.alarm.repository;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import io.yak.ops.common.enums.ReleaseState;

/**
 * Lightweight, decoupled view of a job instance, used by the alarm engine to
 * enrich an {@link org.apache.seatunnel.plugin.alarm.api.AlarmData} without
 * depending on the full {@code JobInstance} entity.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class JobInstanceBasic {

    private Long jobInstanceId;

    private Long jobDefinitionId;

    private String jobName;

    private String jobMode;

    private String engineJobId;

    /** Release state of the job definition; alarms only fire for ONLINE tasks. */
    private ReleaseState releaseState;
}
