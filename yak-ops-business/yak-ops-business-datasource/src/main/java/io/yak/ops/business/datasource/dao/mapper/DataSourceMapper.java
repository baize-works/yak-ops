package io.yak.ops.business.datasource.dao.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import io.yak.ops.common.bean.po.datasource.DataSourcePO;
import io.yak.ops.common.bean.vo.datasource.DataSourceSummaryVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

/**
 * 数据源 MyBatis 映射接口。
 *
 * <p>当前数据源管理仅包含单表 CRUD，使用 MyBatis-Plus BaseMapper；后续多表关联查询统一放入
 * {@code mapper/datasource/*.xml}。</p>
 */
@Mapper
public interface DataSourceMapper extends BaseMapper<DataSourcePO> {

  @Select(
      "SELECT COUNT(*) AS total, "
          + "COALESCE(SUM(CASE WHEN conn_status = 'CONNECTED' THEN 1 ELSE 0 END), 0) AS connected, "
          + "COALESCE(SUM(CASE WHEN conn_status = 'DISCONNECTED' THEN 1 ELSE 0 END), 0) AS disconnected, "
          + "COALESCE(SUM(CASE WHEN conn_status = 'UNKNOWN' THEN 1 ELSE 0 END), 0) AS unknown, "
          + "COUNT(DISTINCT environment) AS environmentCount "
          + "FROM yak_ops_data_source")
  DataSourceSummaryVO selectSummary();
}
