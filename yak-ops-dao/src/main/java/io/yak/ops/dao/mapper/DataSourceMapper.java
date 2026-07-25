package io.yak.ops.dao.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import io.yak.ops.dao.entity.DataSource;

import java.util.List;

@Mapper
public interface DataSourceMapper extends BaseMapper<DataSource> {
}
