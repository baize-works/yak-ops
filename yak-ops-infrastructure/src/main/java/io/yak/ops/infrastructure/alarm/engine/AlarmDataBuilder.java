package io.yak.ops.infrastructure.alarm.engine;

import org.apache.seatunnel.plugin.alarm.api.AlarmData;
import org.apache.seatunnel.plugin.alarm.api.AlarmSeverity;
import io.yak.ops.infrastructure.alarm.event.JobStatusChangedEvent;
import io.yak.ops.infrastructure.alarm.repository.JobInstanceBasic;

/**
 * Builds a domain-agnostic {@link AlarmData} from a status-change event.
 * Mirrors DolphinScheduler's {@code AlertSender#getAlertData} which maps a
 * domain event into the minimal {@code AlertData}.
 */
public final class AlarmDataBuilder {

    private AlarmDataBuilder() {
    }

    public static AlarmData build(JobStatusChangedEvent event,
                                  JobInstanceBasic basic,
                                  AlarmSeverity severity) {
        String jobName = basic != null ? basic.getJobName() : null;
        String newStatus = event.getNewStatus() == null ? null : event.getNewStatus().name();
        String oldStatus = event.getOldStatus() == null ? null : event.getOldStatus().name();

        String title = String.format("任务[%s]状态变更为 %s",
                jobName == null ? String.valueOf(event.getJobInstanceId()) : jobName,
                newStatus);

        StringBuilder content = new StringBuilder();
        content.append("LinkUp 任务状态发生变更\n");
        if (jobName != null) {
            content.append("任务名称: ").append(jobName).append("\n");
        }
        content.append("任务实例ID: ").append(event.getJobInstanceId()).append("\n");
        if (basic != null && basic.getJobDefinitionId() != null) {
            content.append("任务定义ID: ").append(basic.getJobDefinitionId()).append("\n");
        }
        if (basic != null && basic.getJobMode() != null) {
            content.append("任务模式: ").append(basic.getJobMode()).append("\n");
        }
        content.append("状态变更: ").append(oldStatus == null ? "-" : oldStatus)
                .append(" -> ").append(newStatus).append("\n");
        String engineJobId = event.getEngineJobId() != null
                ? event.getEngineJobId()
                : (basic != null ? basic.getEngineJobId() : null);
        if (engineJobId != null) {
            content.append("引擎任务ID: ").append(engineJobId).append("\n");
        }
        if (event.getErrorMessage() != null && !event.getErrorMessage().trim().isEmpty()) {
            content.append("错误信息: ").append(event.getErrorMessage());
        }

        return AlarmData.builder()
                .id(event.getJobInstanceId())
                .title(title)
                .content(content.toString())
                .log(event.getErrorMessage())
                .severity(severity)
                .build();
    }

    public static AlarmSeverity parseSeverity(String severity) {
        if (severity == null) {
            return AlarmSeverity.WARN;
        }
        try {
            return AlarmSeverity.valueOf(severity.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return AlarmSeverity.WARN;
        }
    }
}
