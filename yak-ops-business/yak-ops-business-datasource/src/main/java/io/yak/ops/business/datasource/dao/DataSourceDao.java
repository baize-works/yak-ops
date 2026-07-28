package io.yak.ops.business.datasource.dao;

import io.yak.ops.business.datasource.common.dto.DataSourceQueryDTO;
import io.yak.ops.business.datasource.common.po.DataSourcePO;
import java.util.List;

/** 数据源数据访问接口。 */
public interface DataSourceDao {

  int addDataSource(DataSourcePO dataSourcePO);

  int editDataSource(DataSourcePO dataSourcePO);

  DataSourcePO selectById(Long id);

  long count(DataSourceQueryDTO queryDTO);

  List<DataSourcePO> selectPage(DataSourceQueryDTO queryDTO);

  List<DataSourcePO> selectAll(String dbType);

  boolean existsByName(String name, Long excludeId);

  boolean deleteById(Long id);

  boolean updateConnectionStatus(Long id, String connStatus);
}
