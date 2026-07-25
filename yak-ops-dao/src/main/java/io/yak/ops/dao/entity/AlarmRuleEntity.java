package io.yak.ops.dao.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.EqualsAndHashCode;

/**
 * An alarm rule: which jobs, on which statuses, with which severity, trigger
 * an alarm. Linked to channels through {@link AlarmRuleChannelEntity}.
 */
@Data
@EqualsAndHashCode(callSuper = true)
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
@TableName("t_baize_flow_alarm_rule")
public class AlarmRuleEntity extends BaseEntity {

    private String name;

    /**
     * Target job definition ids as a comma-separated list, e.g. "1,2,3".
     * Null means all jobs.
     */
    private String targetJobs;

    /**
     * Comma-separated {@link io.yak.ops.domain.enums.JobStatus}
     * names that should trigger an alarm, e.g. "FAILED,CANCELED".
     */
    private String triggerStatuses;

    /**
     * Comma-separated job definition ids to exclude from this rule, even when
     * the rule otherwise matches (e.g. a null job_definition_id "all jobs" rule
     * that should skip a few noisy tasks). Nullable.
     */
    private String excludes;

    /** INFO / WARN / CRITICAL */
    private String severity;

    /** 0 disabled, 1 enabled. */
    private Integer enabled;

    private String description;
}
