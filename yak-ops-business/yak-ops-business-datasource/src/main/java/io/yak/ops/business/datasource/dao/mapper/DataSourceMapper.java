package io.yak.ops.business.datasource.dao.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import io.yak.ops.common.bean.po.datasource.DataSourcePO;
import org.apache.ibatis.annotations.Mapper;

/**
 * 数据源 MyBatis 映射接口。
 *
 * <p>当前数据源管理仅包含单表 CRUD，使用 MyBatis-Plus BaseMapper；后续多表关联查询统一放入
 * {@code mapper/datasource/*.xml}。</p>
 */
@Mapper
public interface DataSourceMapper extends BaseMapper<DataSourcePO> {
}
