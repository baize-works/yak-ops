package io.baize.flow.dao.repository.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.NonNull;
import org.apache.commons.collections4.CollectionUtils;
import io.baize.flow.dao.entity.AlarmRuleChannelEntity;
import io.baize.flow.dao.mapper.AlarmRuleChannelMapper;
import io.baize.flow.dao.repository.AlarmRuleChannelDao;
import io.baize.flow.dao.repository.BaseDao;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Collections;
import java.util.List;

@Repository
public class AlarmRuleChannelDaoImpl extends BaseDao<AlarmRuleChannelEntity, AlarmRuleChannelMapper>
        implements AlarmRuleChannelDao {

    public AlarmRuleChannelDaoImpl(@NonNull AlarmRuleChannelMapper alarmRuleChannelMapper) {
        super(alarmRuleChannelMapper);
    }

    @Override
    public List<AlarmRuleChannelEntity> listByRuleId(Long ruleId) {
        if (ruleId == null) {
            return java.util.Collections.emptyList();
        }
        LambdaQueryWrapper<AlarmRuleChannelEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AlarmRuleChannelEntity::getRuleId, ruleId);
        return mybatisMapper.selectList(wrapper);
    }

    @Override
    public List<AlarmRuleChannelEntity> listByRuleIds(Collection<Long> ruleIds) {
        if (CollectionUtils.isEmpty(ruleIds)) {
            return java.util.Collections.emptyList();
        }
        LambdaQueryWrapper<AlarmRuleChannelEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.in(AlarmRuleChannelEntity::getRuleId, ruleIds);
        return mybatisMapper.selectList(wrapper);
    }

    @Override
    public void deleteByRuleId(Long ruleId) {
        if (ruleId == null) {
            return;
        }
        LambdaQueryWrapper<AlarmRuleChannelEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AlarmRuleChannelEntity::getRuleId, ruleId);
        mybatisMapper.delete(wrapper);
    }

    @Override
    public void deleteByChannelId(Long channelId) {
        if (channelId == null) {
            return;
        }
        LambdaQueryWrapper<AlarmRuleChannelEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AlarmRuleChannelEntity::getChannelId, channelId);
        mybatisMapper.delete(wrapper);
    }
}
