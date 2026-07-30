package io.yak.ops.business.sync.offline.dao;

import com.baomidou.mybatisplus.core.metadata.IPage;
import io.yak.ops.common.bean.dto.sync.offline.OfflineJobExecutionQueryDTO;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobExecutionPO;

/** 离线同步任务实例数据访问接口。 */
public interface OfflineJobExecutionDao {

  OfflineJobExecutionPO selectById(Long id);

  boolean insert(OfflineJobExecutionPO executionPO);

  boolean updateById(OfflineJobExecutionPO executionPO);

  IPage<OfflineJobExecutionPO> selectPage(OfflineJobExecutionQueryDTO queryDTO);
}
