package io.yak.ops.infrastructure.alarm.repository;

import io.yak.ops.dao.entity.AlarmRecordEntity;

import java.util.List;

/**
 * Read/write boundary for alarm rule matching and alarm record persistence.
 *
 * <p>
 * Narrow on purpose so the {@code AlarmRuleEngine} can be unit-tested with an
 * in-memory implementation, while production uses a MyBatis-Plus backed impl.
 * </p>
 */
public interface AlarmRuleTargetRepository {

    /**
     * Find all enabled rules that match the given job definition and new
     * status, each pre-loaded with its enabled channels.
     *
     * @param jobDefinitionId target definition id, may be null (matches rules
     *                        whose own job_definition_id is null = all jobs)
     * @param newStatus       new {@link io.yak.ops.domain.enums.JobStatus} name
     */
    List<AlarmTarget> findMatchedTargets(Long jobDefinitionId, String newStatus);

    /**
     * Persist a delivery record.
     */
    void saveRecord(AlarmRecordEntity record);
}
