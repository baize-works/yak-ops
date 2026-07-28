package io.yak.ops.business.datasource.service;

import io.yak.ops.business.datasource.common.vo.DataSourcePluginConfigVO;

/** 数据源动态表单配置服务。 */
public interface DataSourcePluginConfigService {

  DataSourcePluginConfigVO getPluginConfig(String pluginType);

  boolean installPlugin(String pluginType);
}
