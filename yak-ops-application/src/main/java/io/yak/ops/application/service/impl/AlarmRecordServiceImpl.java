package io.yak.ops.application.service.impl;

import com.baomidou.mybatisplus.core.metadata.IPage;
import javax.annotation.Resource;
import io.yak.ops.application.service.AlarmRecordService;
import io.yak.ops.dao.entity.AlarmRecordEntity;
import io.yak.ops.dao.repository.AlarmRecordDao;
import org.springframework.stereotype.Service;

@Service
public class AlarmRecordServiceImpl implements AlarmRecordService {

    @Resource
    private AlarmRecordDao alarmRecordDao;

    @Override
    public IPage<AlarmRecordEntity> page(int pageNo, int pageSize, Long jobInstanceId) {
        return page(pageNo, pageSize, jobInstanceId, null, null, null);
    }

    @Override
    public IPage<AlarmRecordEntity> page(int pageNo, int pageSize, Long jobInstanceId,
                                           String channelType, String severity, Integer success) {
        return alarmRecordDao.page(pageNo, pageSize, jobInstanceId, channelType, severity, success);
    }

    @Override
    public void save(AlarmRecordEntity entity) {
        if (entity.getSentTime() == null) {
            entity.setSentTime(new java.util.Date());
        }
        entity.initInsert();
        alarmRecordDao.insert(entity);
    }
}
