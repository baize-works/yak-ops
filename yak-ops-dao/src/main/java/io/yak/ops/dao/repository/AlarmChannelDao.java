package io.yak.ops.dao.repository;

import io.yak.ops.dao.entity.AlarmChannelEntity;

import java.util.Collection;
import java.util.List;

public interface AlarmChannelDao extends IDao<AlarmChannelEntity> {

    List<AlarmChannelEntity> listEnabled();

    List<AlarmChannelEntity> listEnabledByIds(Collection<Long> ids);
}
