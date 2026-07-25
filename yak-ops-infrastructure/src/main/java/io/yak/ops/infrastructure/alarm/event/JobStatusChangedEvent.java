package io.yak.ops.infrastructure.alarm.event;

import lombok.Getter;
import io.yak.ops.domain.enums.JobStatus;
import org.springframework.context.ApplicationEvent;

import java.util.Date;

/**
 * Published whenever a job instance reaches a (new) status.
 *
 * <p>
 * The alarm sub-system listens to this event and dispatches alarms according to
 * the configured rules. Publishing is centralized so that all status-write
 * paths (watcher, manual pause, recovery, ...) can trigger alarms uniformly.
 * </p>
 *
 * <p>
 * {@code jobDefinitionId}, {@code oldStatus} and {@code engineJobId} may be
 * null when the publisher does not have them; the engine enriches the message
 * via {@code JobInstanceLookup} when needed.
 * </p>
 */
@Getter
public class JobStatusChangedEvent extends ApplicationEvent {

    private final Long jobInstanceId;

    private final Long jobDefinitionId;

    private final JobStatus newStatus;

    private final JobStatus oldStatus;

    private final String errorMessage;

    private final String engineJobId;

    private final Date eventTime;

    public JobStatusChangedEvent(Object source,
                                 Long jobInstanceId,
                                 Long jobDefinitionId,
                                 JobStatus newStatus,
                                 JobStatus oldStatus,
                                 String errorMessage,
                                 String engineJobId) {
        super(source);
        this.jobInstanceId = jobInstanceId;
        this.jobDefinitionId = jobDefinitionId;
        this.newStatus = newStatus;
        this.oldStatus = oldStatus;
        this.errorMessage = errorMessage;
        this.engineJobId = engineJobId;
        this.eventTime = new Date();
    }
}
