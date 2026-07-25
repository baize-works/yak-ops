package io.yak.ops.dao.repository;

import com.baomidou.mybatisplus.core.metadata.IPage;
import io.yak.ops.dao.entity.AlarmRecordEntity;

public interface AlarmRecordDao extends IDao<AlarmRecordEntity> {

    IPage<AlarmRecordEntity> page(int pageNo, int pageSize, Long jobInstanceId,
                                  String channelType, String severity, Integer success);
}
