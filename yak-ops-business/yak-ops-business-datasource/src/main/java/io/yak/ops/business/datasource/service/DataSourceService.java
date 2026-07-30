package io.yak.ops.business.datasource.service;

import io.yak.framework.common.PagingData;
import io.yak.ops.common.bean.dto.datasource.DataSourceConnectTestDTO;
import io.yak.ops.common.bean.dto.datasource.DataSourceDTO;
import io.yak.ops.common.bean.dto.datasource.DataSourceQueryDTO;
import io.yak.ops.common.bean.vo.datasource.DataSourceOptionVO;
import io.yak.ops.common.bean.vo.datasource.DataSourceSummaryVO;
import io.yak.ops.common.bean.vo.datasource.DataSourceVO;
import java.util.List;

/** 数据源管理服务。 */
public interface DataSourceService {

  boolean createDataSource(DataSourceDTO dataSourceDTO);

  boolean updateDataSource(Long id, DataSourceDTO dataSourceDTO);

  DataSourceVO getDataSource(Long id);

  PagingData<DataSourceVO> getDataSourcePage(DataSourceQueryDTO queryDTO);

  DataSourceSummaryVO getSummary();

  PagingData<DataSourceVO> getAllDataSources();

  boolean deleteDataSource(Long id);

  boolean testConnection(Long id);

  boolean testConnection(DataSourceConnectTestDTO connectTestDTO);

  List<DataSourceOptionVO> getOptions(String dbType);
}
