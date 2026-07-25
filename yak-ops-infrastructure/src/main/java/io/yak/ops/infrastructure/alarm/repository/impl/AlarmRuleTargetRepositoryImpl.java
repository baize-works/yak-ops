package io.yak.ops.infrastructure.alarm.repository.impl;

import javax.annotation.Resource;
import io.yak.ops.infrastructure.alarm.repository.AlarmRuleTargetRepository;
import io.yak.ops.infrastructure.alarm.repository.AlarmTarget;
import io.yak.ops.dao.entity.AlarmChannelEntity;
import io.yak.ops.dao.entity.AlarmRecordEntity;
import io.yak.ops.dao.entity.AlarmRuleChannelEntity;
import io.yak.ops.dao.entity.AlarmRuleEntity;
import io.yak.ops.dao.repository.AlarmChannelDao;
import io.yak.ops.dao.repository.AlarmRecordDao;
import io.yak.ops.dao.repository.AlarmRuleChannelDao;
import io.yak.ops.dao.repository.AlarmRuleDao;
import org.springframework.stereotype.Repository;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * MyBatis-Plus backed implementation of {@link AlarmRuleTargetRepository}.
 */
@Repository
public class AlarmRuleTargetRepositoryImpl implements AlarmRuleTargetRepository {

    @Resource
    private AlarmRuleDao ruleDao;

    @Resource
    private AlarmRuleChannelDao ruleChannelDao;

    @Resource
    private AlarmChannelDao channelDao;

    @Resource
    private AlarmRecordDao recordDao;

    @Override
    public List<AlarmTarget> findMatchedTargets(Long jobDefinitionId, String newStatus) {
        if (newStatus == null || newStatus.trim().isEmpty()) {
            return java.util.Collections.emptyList();
        }

        List<AlarmRuleEntity> rules = ruleDao.listEnabled();
        if (rules == null || rules.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        List<AlarmRuleEntity> matched = rules.stream()
                .filter(r -> statusMatches(r.getTriggerStatuses(), newStatus))
                .filter(r -> targetJobsMatches(r.getTargetJobs(), jobDefinitionId))
                .filter(r -> !excludesContains(r.getExcludes(), jobDefinitionId))
                .collect(java.util.stream.Collectors.toList());
        if (matched.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        List<Long> ruleIds = matched.stream().map(AlarmRuleEntity::getId).collect(java.util.stream.Collectors.toList());

        List<AlarmRuleChannelEntity> links = ruleChannelDao.listByRuleIds(ruleIds);
        if (links == null || links.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        Map<Long, List<AlarmRuleChannelEntity>> linksByRule = links.stream()
                .collect(Collectors.groupingBy(AlarmRuleChannelEntity::getRuleId));

        Set<Long> channelIds = links.stream()
                .map(AlarmRuleChannelEntity::getChannelId)
                .collect(Collectors.toSet());

        List<AlarmChannelEntity> channels = channelDao.listEnabledByIds(channelIds);
        Map<Long, AlarmChannelEntity> channelMap = channels.stream()
                .collect(Collectors.toMap(AlarmChannelEntity::getId, c -> c));

        return matched.stream()
                .map(rule -> buildTarget(rule, linksByRule.getOrDefault(rule.getId(), java.util.Collections.emptyList()),
                        channelMap))
                .filter(t -> t.getChannels() != null && !t.getChannels().isEmpty())
                .collect(java.util.stream.Collectors.toList());
    }

    @Override
    public void saveRecord(AlarmRecordEntity record) {
        if (record == null) {
            return;
        }
        record.initInsert();
        recordDao.insert(record);
    }

    private AlarmTarget buildTarget(AlarmRuleEntity rule,
                                    List<AlarmRuleChannelEntity> links,
                                    Map<Long, AlarmChannelEntity> channelMap) {
        List<AlarmTarget.AlarmTargetChannel> channels = links.stream()
                .map(AlarmRuleChannelEntity::getChannelId)
                .map(channelMap::get)
                .filter(c -> c != null)
                .map(c -> AlarmTarget.AlarmTargetChannel.builder()
                        .channelId(c.getId())
                        .channelType(c.getChannelType())
                        .configJson(c.getConfigJson())
                        .build())
                .collect(java.util.stream.Collectors.toList());

        return AlarmTarget.builder()
                .ruleId(rule.getId())
                .ruleName(rule.getName())
                .severity(rule.getSeverity())
                .channels(channels)
                .build();
    }

    private boolean statusMatches(String triggerStatuses, String newStatus) {
        if (triggerStatuses == null || triggerStatuses.trim().isEmpty()) {
            return false;
        }
        return Arrays.stream(triggerStatuses.split(","))
                .map(String::trim)
                .anyMatch(newStatus::equals);
    }

    private boolean excludesContains(String excludes, Long jobDefinitionId) {
        if (excludes == null || excludes.trim().isEmpty() || jobDefinitionId == null) {
            return false;
        }
        return Arrays.stream(excludes.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .anyMatch(s -> s.equals(jobDefinitionId.toString()));
    }

    /**
     * Check if targetJobs matches the given jobDefinitionId.
     * targetJobs is null → matches all jobs.
     * targetJobs is a comma-separated list → matches if it contains jobDefinitionId.
     */
    private boolean targetJobsMatches(String targetJobs, Long jobDefinitionId) {
        if (targetJobs == null || targetJobs.trim().isEmpty()) {
            return true;
        }
        if (jobDefinitionId == null) {
            return false;
        }
        return Arrays.stream(targetJobs.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .anyMatch(s -> s.equals(jobDefinitionId.toString()));
    }
}
