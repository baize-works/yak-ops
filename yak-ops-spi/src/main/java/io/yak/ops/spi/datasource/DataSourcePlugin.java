package io.yak.ops.spi.datasource;

import io.yak.ops.common.bean.vo.datasource.DataSourcePluginConfigVO;
import io.yak.ops.common.enums.datasource.DataSourceDbType;

/** 数据源插件稳定扩展契约。 */
public interface DataSourcePlugin {

  /** 插件唯一对应的数据源类型。 */
  DataSourceDbType dbType();

  /** 插件负责下发自己的动态表单和默认参数。 */
  DataSourcePluginConfigVO pluginConfig();

  /** 解析、校验并规范化前端连接参数。 */
  DataSourceConnection parseConnection(String connectionJson);

  /** 执行连接测试，失败时抛出 {@link DataSourcePluginException}。 */
  void testConnection(DataSourceConnection connection, int timeoutSeconds);

  /** 创建由插件实现的 Catalog 元数据访问器。 */
  DataSourceCatalog createCatalog(DataSourceConnection connection, int timeoutSeconds);

  /** 插件是否理解指定连接地址。 */
  default boolean acceptsUrl(String jdbcUrl) {
    return false;
  }
}
