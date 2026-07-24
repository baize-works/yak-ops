package io.baize.flow.dao.repository.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import jakarta.annotation.Resource;
import lombok.NonNull;
import io.baize.flow.dao.entity.DataSourcePluginConfig;
import io.baize.flow.dao.mapper.DatasourcePluginConfigMapper;
import io.baize.flow.dao.repository.BaseDao;
import io.baize.flow.dao.repository.DataSourcePluginConfigDao;
import io.baize.flow.plugin.spi.enums.DbType;
import org.springframework.stereotype.Repository;

@Repository
public class DataSourcePluginConfigDaoImpl
        extends BaseDao<DataSourcePluginConfig, DatasourcePluginConfigMapper>
        implements DataSourcePluginConfigDao {

    @Resource
    private DatasourcePluginConfigMapper datasourcePluginConfigMapper;

    public DataSourcePluginConfigDaoImpl(@NonNull DatasourcePluginConfigMapper datasourcePluginConfigMapper) {
        super(datasourcePluginConfigMapper);
    }

    @Override
    public DataSourcePluginConfig queryByPluginType(DbType pluginType) {
        return datasourcePluginConfigMapper.selectOne(
                new LambdaQueryWrapper<DataSourcePluginConfig>()
                        .eq(DataSourcePluginConfig::getPluginType, pluginType)
        );
    }

    @Override
    public boolean existsByPluginType(DbType pluginType) {
        Long count = datasourcePluginConfigMapper.selectCount(
                new LambdaQueryWrapper<DataSourcePluginConfig>()
                        .eq(DataSourcePluginConfig::getPluginType, pluginType)
        );
        return count != null && count > 0;
    }

    @Override
    public int insertPluginConfig(DataSourcePluginConfig entity) {
        return datasourcePluginConfigMapper.insert(entity);
    }

    @Override
    public int updatePluginConfig(DataSourcePluginConfig entity) {
        return datasourcePluginConfigMapper.updateById(entity);
    }
}