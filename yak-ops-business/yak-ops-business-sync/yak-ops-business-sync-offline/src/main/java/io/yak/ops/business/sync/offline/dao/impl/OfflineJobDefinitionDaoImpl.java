package io.yak.ops.business.sync.offline.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.dao.OfflineJobDefinitionDao;
import io.yak.ops.business.sync.offline.dao.mapper.OfflineJobDefinitionMapper;
import io.yak.ops.common.bean.dto.sync.offline.OfflineJobDefinitionQueryDTO;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobDefinitionPO;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;

/**
 * 基于 MyBatis-Plus 的离线同步任务定义数据访问实现。
 *
 * @author weifuwan
 */
@ConditionalOnOfflineSyncEnabled
@Repository
@RequiredArgsConstructor
public class OfflineJobDefinitionDaoImpl implements OfflineJobDefinitionDao {

  private static final List<String> ACTIVE_STATUSES =
      List.of("CREATED", "SUBMITTED", "QUEUED", "RUNNING");

  private final OfflineJobDefinitionMapper mapper;

  @Override
  public OfflineJobDefinitionPO selectById(Long id) {
    return mapper.selectById(id);
  }

  @Override
  public boolean insert(OfflineJobDefinitionPO definitionPO) {
    return mapper.insert(definitionPO) > 0;
  }

  @Override
  public boolean updateById(OfflineJobDefinitionPO definitionPO) {
    return mapper.updateById(definitionPO) > 0;
  }

  @Override
  public boolean deleteById(Long id) {
    return mapper.deleteById(id) > 0;
  }

  @Override
  public boolean existsByName(String jobName, Long excludeId) {
    LambdaQueryWrapper<OfflineJobDefinitionPO> query =
        new LambdaQueryWrapper<OfflineJobDefinitionPO>()
            .eq(OfflineJobDefinitionPO::getJobName, jobName);
    if (excludeId != null) {
      query.ne(OfflineJobDefinitionPO::getId, excludeId);
    }
    return mapper.selectCount(query) > 0L;
  }

  @Override
  public IPage<OfflineJobDefinitionPO> selectPage(OfflineJobDefinitionQueryDTO queryDTO) {
    OfflineJobDefinitionQueryDTO condition =
        queryDTO == null ? new OfflineJobDefinitionQueryDTO() : queryDTO;
    LambdaQueryWrapper<OfflineJobDefinitionPO> query = new LambdaQueryWrapper<>();
    if (StringUtils.hasText(condition.getJobName())) {
      query.like(OfflineJobDefinitionPO::getJobName, condition.getJobName().trim());
    }
    if (condition.getId() != null && condition.getId() > 0L) {
      query.eq(OfflineJobDefinitionPO::getId, condition.getId());
    }
    if (StringUtils.hasText(condition.getStatus())) {
      String status = normalizeStatus(condition.getStatus());
      if ("RUNNING".equals(status)) {
        query.in(OfflineJobDefinitionPO::getLastJobStatus, ACTIVE_STATUSES);
      } else {
        query.eq(OfflineJobDefinitionPO::getLastJobStatus, status);
      }
    }
    addLike(query, OfflineJobDefinitionPO::getSourceType, condition.getSourceType());
    addLike(query, OfflineJobDefinitionPO::getSinkType, condition.getSinkType());
    addLike(query, OfflineJobDefinitionPO::getSourceTable, condition.getSourceTable());
    addLike(query, OfflineJobDefinitionPO::getSinkTable, condition.getSinkTable());
    if (condition.getCreateTimeStart() != null) {
      query.ge(OfflineJobDefinitionPO::getCreateTime, condition.getCreateTimeStart());
    }
    if (condition.getCreateTimeEnd() != null) {
      query.le(OfflineJobDefinitionPO::getCreateTime, condition.getCreateTimeEnd());
    }
    query.orderByDesc(OfflineJobDefinitionPO::getUpdateTime)
        .orderByDesc(OfflineJobDefinitionPO::getId);
    return mapper.selectPage(
        new Page<>(condition.getCurrent(), condition.getPageSize()), query);
  }

  private <T> void addLike(
      LambdaQueryWrapper<OfflineJobDefinitionPO> query,
      com.baomidou.mybatisplus.core.toolkit.support.SFunction<OfflineJobDefinitionPO, T> column,
      String value) {
    if (StringUtils.hasText(value)) {
      query.like(column, value.trim());
    }
  }

  private String normalizeStatus(String status) {
    String normalized = status.trim().toUpperCase(Locale.ROOT);
    return "COMPLETED".equals(normalized) || "FINISHED".equals(normalized)
        ? "SUCCEEDED"
        : normalized;
  }
}
