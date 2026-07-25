package io.yak.ops.application.service.impl;

import javax.annotation.Resource;
import io.yak.ops.application.service.AlarmRuleService;
import io.yak.ops.dao.entity.AlarmRuleChannelEntity;
import io.yak.ops.dao.entity.AlarmRuleEntity;
import io.yak.ops.dao.repository.AlarmRuleChannelDao;
import io.yak.ops.dao.repository.AlarmRuleDao;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.Date;
import java.util.List;

@Service
public class AlarmRuleServiceImpl implements AlarmRuleService {

    @Resource
    private AlarmRuleDao alarmRuleDao;

    @Resource
    private AlarmRuleChannelDao alarmRuleChannelDao;

    @Override
    public AlarmRuleEntity getById(Long id) {
        return alarmRuleDao.queryById(id);
    }

    @Override
    public List<AlarmRuleEntity> list() {
        return alarmRuleDao.queryAll();
    }

    @Override
    @Transactional
    public Long create(AlarmRuleCommand command) {
        AlarmRuleEntity entity = toEntity(command);
        if (entity.getEnabled() == null) {
            entity.setEnabled(1);
        }
        entity.initInsert();
        alarmRuleDao.insert(entity);
        relinkChannels(entity.getId(), command.getChannelIds());
        return entity.getId();
    }

    @Override
    @Transactional
    public boolean update(AlarmRuleCommand command) {
        if (command.getId() == null) {
            return false;
        }
        AlarmRuleEntity entity = toEntity(command);
        entity.setUpdateTime(new Date());
        boolean updated = alarmRuleDao.updateById(entity);
        if (updated) {
            relinkChannels(entity.getId(), command.getChannelIds());
        }
        return updated;
    }

    @Override
    @Transactional
    public boolean delete(Long id) {
        if (id == null) {
            return false;
        }
        alarmRuleChannelDao.deleteByRuleId(id);
        return alarmRuleDao.deleteById(id);
    }

    @Override
    public List<AlarmRuleChannelEntity> listChannels(Long ruleId) {
        if (ruleId == null) {
            return java.util.Collections.emptyList();
        }
        return alarmRuleChannelDao.listByRuleId(ruleId);
    }

    @Override
    public List<AlarmRuleChannelEntity> listAllChannels() {
        return alarmRuleChannelDao.queryAll();
    }

    private void relinkChannels(Long ruleId, List<Long> channelIds) {
        alarmRuleChannelDao.deleteByRuleId(ruleId);
        if (channelIds == null || channelIds.isEmpty()) {
            return;
        }
        for (Long channelId : channelIds) {
            if (channelId == null) {
                continue;
            }
            AlarmRuleChannelEntity link = new AlarmRuleChannelEntity();
            link.setRuleId(ruleId);
            link.setChannelId(channelId);
            link.initInsert();
            alarmRuleChannelDao.insert(link);
        }
    }

    private AlarmRuleEntity toEntity(AlarmRuleCommand command) {
        // id / createTime / updateTime are inherited from BaseEntity, so they are
        // not part of AlarmRuleEntity's @Builder; set id via the setter instead.
        AlarmRuleEntity entity = AlarmRuleEntity.builder()
                .name(command.getName())
                .targetJobs(command.getTargetJobs())
                .triggerStatuses(command.getTriggerStatuses())
                .excludes(command.getExcludes())
                .severity(command.getSeverity())
                .enabled(command.getEnabled())
                .description(command.getDescription())
                .build();
        entity.setId(command.getId());
        return entity;
    }
}
