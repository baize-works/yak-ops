package io.yak.ops.business.datasource.service;

import io.yak.framework.common.PagingData;
import io.yak.ops.business.datasource.common.dto.DataSourceConnectTestDTO;
import io.yak.ops.business.datasource.common.dto.DataSourceDTO;
import io.yak.ops.business.datasource.common.dto.DataSourceQueryDTO;
import io.yak.ops.business.datasource.common.vo.DataSourceOptionVO;
import io.yak.ops.business.datasource.common.vo.DataSourceVO;
import java.util.List;

/** 数据源管理服务。 */
public interface DataSourceService {

  boolean createDataSource(DataSourceDTO dataSourceDTO);

  boolean updateDataSource(Long id, DataSourceDTO dataSourceDTO);

  DataSourceVO getDataSource(Long id);

  PagingData<DataSourceVO> getDataSourcePage(DataSourceQueryDTO queryDTO);

  PagingData<DataSourceVO> getAllDataSources();

  boolean deleteDataSource(Long id);

  boolean testConnection(Long id);

  boolean testConnection(DataSourceConnectTestDTO connectTestDTO);

  List<DataSourceOptionVO> getOptions(String dbType);
}
