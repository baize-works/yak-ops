package io.yak.ops.business.datasource.dao;

import com.baomidou.mybatisplus.core.metadata.IPage;
import io.yak.ops.common.bean.dto.datasource.DataSourceQueryDTO;
import io.yak.ops.common.bean.po.datasource.DataSourcePO;
import io.yak.ops.common.bean.vo.datasource.DataSourceSummaryVO;
import io.yak.ops.common.enums.datasource.DataSourceConnStatus;
import io.yak.ops.common.enums.datasource.DataSourceDbType;
import java.util.List;

/** 数据源数据访问接口。 */
public interface DataSourceDao {

  int addDataSource(DataSourcePO dataSourcePO);

  int editDataSource(DataSourcePO dataSourcePO);

  DataSourcePO selectById(Long id);

  IPage<DataSourcePO> selectPage(DataSourceQueryDTO queryDTO);

  DataSourceSummaryVO selectSummary();

  List<DataSourcePO> selectAll(DataSourceDbType dbType);

  boolean existsByName(String name, Long excludeId);

  boolean deleteById(Long id);

  boolean updateConnectionStatus(Long id, DataSourceConnStatus connStatus);
}
