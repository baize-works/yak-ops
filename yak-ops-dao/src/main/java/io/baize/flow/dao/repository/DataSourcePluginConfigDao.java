package io.baize.flow.dao.repository;


import io.baize.flow.dao.entity.DataSourcePluginConfig;
import io.baize.flow.plugin.spi.enums.DbType;

public interface DataSourcePluginConfigDao extends IDao<DataSourcePluginConfig> {

    DataSourcePluginConfig queryByPluginType(DbType pluginType);

    boolean existsByPluginType(DbType pluginType);

    int insertPluginConfig(DataSourcePluginConfig entity);

    int updatePluginConfig(DataSourcePluginConfig existing);
}
