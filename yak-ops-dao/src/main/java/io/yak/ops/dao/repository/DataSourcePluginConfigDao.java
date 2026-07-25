package io.yak.ops.dao.repository;


import io.yak.ops.dao.entity.DataSourcePluginConfig;
import io.yak.ops.plugin.spi.enums.DbType;

public interface DataSourcePluginConfigDao extends IDao<DataSourcePluginConfig> {

    DataSourcePluginConfig queryByPluginType(DbType pluginType);

    boolean existsByPluginType(DbType pluginType);

    int insertPluginConfig(DataSourcePluginConfig entity);

    int updatePluginConfig(DataSourcePluginConfig existing);
}
