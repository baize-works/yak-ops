package io.yak.ops.dao.repository.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.NonNull;
import io.yak.ops.dao.entity.AlarmRecordEntity;
import io.yak.ops.dao.mapper.AlarmRecordMapper;
import io.yak.ops.dao.repository.AlarmRecordDao;
import io.yak.ops.dao.repository.BaseDao;
import org.springframework.stereotype.Repository;

@Repository
public class AlarmRecordDaoImpl extends BaseDao<AlarmRecordEntity, AlarmRecordMapper>
        implements AlarmRecordDao {

    public AlarmRecordDaoImpl(@NonNull AlarmRecordMapper alarmRecordMapper) {
        super(alarmRecordMapper);
    }

    @Override
    public IPage<AlarmRecordEntity> page(int pageNo, int pageSize, Long jobInstanceId,
                                         String channelType, String severity, Integer success) {
        Page<AlarmRecordEntity> page = new Page<>(pageNo < 1 ? 1 : pageNo, pageSize < 1 ? 10 : pageSize);
        LambdaQueryWrapper<AlarmRecordEntity> wrapper = new LambdaQueryWrapper<>();
        if (jobInstanceId != null) {
            wrapper.eq(AlarmRecordEntity::getJobInstanceId, jobInstanceId);
        }
        if (channelType != null && !channelType.trim().isEmpty()) {
            wrapper.eq(AlarmRecordEntity::getChannelType, channelType);
        }
        if (severity != null && !severity.trim().isEmpty()) {
            wrapper.eq(AlarmRecordEntity::getSeverity, severity);
        }
        if (success != null) {
            wrapper.eq(AlarmRecordEntity::getSuccess, success);
        }
        wrapper.orderByDesc(AlarmRecordEntity::getCreateTime);
        return mybatisMapper.selectPage(page, wrapper);
    }
}
