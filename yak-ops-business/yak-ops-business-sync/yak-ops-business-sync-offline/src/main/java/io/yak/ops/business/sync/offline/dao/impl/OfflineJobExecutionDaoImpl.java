package io.yak.ops.business.sync.offline.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.dao.OfflineJobExecutionDao;
import io.yak.ops.business.sync.offline.dao.mapper.OfflineJobExecutionMapper;
import io.yak.ops.common.bean.dto.sync.offline.OfflineJobExecutionQueryDTO;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobExecutionPO;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;

/**
 * 基于 MyBatis-Plus 的离线同步任务实例数据访问实现。
 *
 * @author weifuwan
 */
@ConditionalOnOfflineSyncEnabled
@Repository
@RequiredArgsConstructor
public class OfflineJobExecutionDaoImpl implements OfflineJobExecutionDao {

  private final OfflineJobExecutionMapper mapper;

  @Override
  public OfflineJobExecutionPO selectById(Long id) {
    return mapper.selectById(id);
  }

  @Override
  public boolean insert(OfflineJobExecutionPO executionPO) {
    return mapper.insert(executionPO) > 0;
  }

  @Override
  public boolean updateById(OfflineJobExecutionPO executionPO) {
    return mapper.updateById(executionPO) > 0;
  }

  @Override
  public IPage<OfflineJobExecutionPO> selectPage(OfflineJobExecutionQueryDTO queryDTO) {
    OfflineJobExecutionQueryDTO condition =
        queryDTO == null ? new OfflineJobExecutionQueryDTO() : queryDTO;
    LambdaQueryWrapper<OfflineJobExecutionPO> query = new LambdaQueryWrapper<>();
    if (condition.getJobDefinitionId() != null && condition.getJobDefinitionId() > 0L) {
      query.eq(OfflineJobExecutionPO::getJobDefinitionId, condition.getJobDefinitionId());
    }
    if (StringUtils.hasText(condition.getStatus())) {
      query.eq(
          OfflineJobExecutionPO::getStatus,
          condition.getStatus().trim().toUpperCase(Locale.ROOT));
    }
    query.orderByDesc(OfflineJobExecutionPO::getId);
    return mapper.selectPage(
        new Page<>(condition.getCurrent(), condition.getPageSize()), query);
  }
}
