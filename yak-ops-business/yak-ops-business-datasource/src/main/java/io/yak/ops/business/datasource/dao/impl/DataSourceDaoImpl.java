package io.yak.ops.business.datasource.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import io.yak.ops.business.datasource.config.ConditionalOnDataSourceEnabled;
import io.yak.ops.business.datasource.dao.DataSourceDao;
import io.yak.ops.business.datasource.dao.mapper.DataSourceMapper;
import io.yak.ops.common.bean.dto.datasource.DataSourceQueryDTO;
import io.yak.ops.common.bean.po.datasource.DataSourcePO;
import io.yak.ops.common.bean.vo.datasource.DataSourceSummaryVO;
import io.yak.ops.common.enums.datasource.DataSourceConnStatus;
import io.yak.ops.common.enums.datasource.DataSourceDbType;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;

/** 数据源数据访问实现。 */
@Repository
@ConditionalOnDataSourceEnabled
@RequiredArgsConstructor
public class DataSourceDaoImpl implements DataSourceDao {

  private final DataSourceMapper dataSourceMapper;

  @Override
  public int addDataSource(DataSourcePO dataSourcePO) {
    return dataSourceMapper.insert(dataSourcePO);
  }

  @Override
  public int editDataSource(DataSourcePO dataSourcePO) {
    return dataSourceMapper.updateById(dataSourcePO);
  }

  @Override
  public DataSourcePO selectById(Long id) {
    return id == null ? null : dataSourceMapper.selectById(id);
  }

  @Override
  public IPage<DataSourcePO> selectPage(DataSourceQueryDTO queryDTO) {
    Page<DataSourcePO> page = Page.of(queryDTO.getPageNo(), queryDTO.getPageSize());
    return dataSourceMapper.selectPage(
        page,
        queryWrapper(queryDTO)
            .orderByDesc(DataSourcePO::getUpdateTime)
            .orderByDesc(DataSourcePO::getId));
  }

  @Override
  public DataSourceSummaryVO selectSummary() {
    return dataSourceMapper.selectSummary();
  }

  @Override
  public List<DataSourcePO> selectAll(DataSourceDbType dbType) {
    return dataSourceMapper.selectList(
        Wrappers.<DataSourcePO>lambdaQuery()
            .eq(dbType != null, DataSourcePO::getDbType, dbType)
            .orderByAsc(DataSourcePO::getName)
            .orderByAsc(DataSourcePO::getId));
  }

  @Override
  public boolean existsByName(String name, Long excludeId) {
    if (!StringUtils.hasText(name)) {
      return false;
    }
    Long count = dataSourceMapper.selectCount(
        Wrappers.<DataSourcePO>lambdaQuery()
            .eq(DataSourcePO::getName, name)
            .ne(excludeId != null, DataSourcePO::getId, excludeId));
    return count != null && count > 0;
  }

  @Override
  public boolean deleteById(Long id) {
    return id != null && dataSourceMapper.deleteById(id) > 0;
  }

  @Override
  public boolean updateConnectionStatus(Long id, DataSourceConnStatus connStatus) {
    return id != null
        && connStatus != null
        && dataSourceMapper.update(
                null,
                Wrappers.<DataSourcePO>lambdaUpdate()
                    .set(DataSourcePO::getConnStatus, connStatus)
                    .eq(DataSourcePO::getId, id))
            > 0;
  }

  private LambdaQueryWrapper<DataSourcePO> queryWrapper(DataSourceQueryDTO queryDTO) {
    LambdaQueryWrapper<DataSourcePO> wrapper = Wrappers.lambdaQuery();
    if (StringUtils.hasText(queryDTO.getKeyword())) {
      wrapper.and(
          nested ->
              nested
                  .like(DataSourcePO::getName, queryDTO.getKeyword())
                  .or()
                  .like(DataSourcePO::getJdbcUrl, queryDTO.getKeyword()));
    }
    return wrapper
        .like(
            StringUtils.hasText(queryDTO.getName()),
            DataSourcePO::getName,
            queryDTO.getName())
        .eq(
            StringUtils.hasText(queryDTO.getDbType()),
            DataSourcePO::getDbType,
            queryDTO.getDbType())
        .eq(
            StringUtils.hasText(queryDTO.getEnvironment()),
            DataSourcePO::getEnvironment,
            queryDTO.getEnvironment())
        .eq(
            StringUtils.hasText(queryDTO.getConnStatus()),
            DataSourcePO::getConnStatus,
            queryDTO.getConnStatus());
  }
}
