package io.yak.ops.dao.repository;

import io.yak.ops.dao.entity.AlarmRuleEntity;

import java.util.List;

public interface AlarmRuleDao extends IDao<AlarmRuleEntity> {

    List<AlarmRuleEntity> listEnabled();
}
