package io.yak.ops.application.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import io.yak.ops.dao.entity.AlarmRecordEntity;

public interface AlarmRecordService {

    IPage<AlarmRecordEntity> page(int pageNo, int pageSize, Long jobInstanceId);

    /**
     * Paginated query with multiple optional filters.
     *
     * @param pageNo       page number (1-based)
     * @param pageSize     page size
     * @param jobInstanceId optional filter by job instance id
     * @param channelType  optional filter by channel type (SPI key)
     * @param severity     optional filter by severity level
     * @param success      optional filter by delivery result (1=success, 0=fail)
     * @return MyBatis-Plus page result containing records and total
     */
    IPage<AlarmRecordEntity> page(int pageNo, int pageSize, Long jobInstanceId,
                                   String channelType, String severity, Integer success);

    void save(AlarmRecordEntity entity);
}
