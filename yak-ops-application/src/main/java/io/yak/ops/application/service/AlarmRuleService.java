package io.yak.ops.application.service;

import lombok.Data;
import io.yak.ops.dao.entity.AlarmRuleChannelEntity;
import io.yak.ops.dao.entity.AlarmRuleEntity;

import java.util.List;

public interface AlarmRuleService {

    AlarmRuleEntity getById(Long id);

    List<AlarmRuleEntity> list();

    Long create(AlarmRuleCommand command);

    boolean update(AlarmRuleCommand command);

    boolean delete(Long id);

    List<AlarmRuleChannelEntity> listChannels(Long ruleId);

    /** Returns all rule-channel links (for batch loading channel associations). */
    List<AlarmRuleChannelEntity> listAllChannels();

    @Data
    class AlarmRuleCommand {
        private Long id;
        private String name;
        private String targetJobs;
        private String triggerStatuses;
        private String excludes;
        private String severity;
        private Integer enabled;
        private String description;
        private List<Long> channelIds;
    }
}
