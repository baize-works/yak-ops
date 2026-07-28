package io.yak.ops.business.datasource.service.impl;

import io.yak.ops.business.datasource.config.ConditionalOnDataSourceEnabled;
import io.yak.ops.business.datasource.plugin.DataSourcePluginRegistry;
import io.yak.ops.business.datasource.service.DataSourcePluginConfigService;
import io.yak.ops.common.bean.vo.datasource.DataSourcePluginConfigVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** 数据源动态表单配置服务，配置内容由具体插件提供。 */
@Service
@ConditionalOnDataSourceEnabled
@RequiredArgsConstructor
public class DataSourcePluginConfigServiceImpl implements DataSourcePluginConfigService {

  private final DataSourcePluginRegistry pluginRegistry;

  @Override
  public DataSourcePluginConfigVO getPluginConfig(String pluginType) {
    return pluginRegistry.get(pluginType).pluginConfig();
  }

  @Override
  public boolean installPlugin(String pluginType) {
    pluginRegistry.get(pluginType);
    return true;
  }
}
