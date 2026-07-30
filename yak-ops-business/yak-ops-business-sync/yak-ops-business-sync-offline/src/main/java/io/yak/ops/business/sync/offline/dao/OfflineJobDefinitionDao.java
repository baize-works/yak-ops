package io.yak.ops.business.sync.offline.dao;

import com.baomidou.mybatisplus.core.metadata.IPage;
import io.yak.ops.common.bean.dto.sync.offline.OfflineJobDefinitionQueryDTO;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobDefinitionPO;

/** 离线同步任务定义数据访问接口。 */
public interface OfflineJobDefinitionDao {

  OfflineJobDefinitionPO selectById(Long id);

  boolean insert(OfflineJobDefinitionPO definitionPO);

  boolean updateById(OfflineJobDefinitionPO definitionPO);

  boolean deleteById(Long id);

  boolean existsByName(String jobName, Long excludeId);

  IPage<OfflineJobDefinitionPO> selectPage(OfflineJobDefinitionQueryDTO queryDTO);
}
