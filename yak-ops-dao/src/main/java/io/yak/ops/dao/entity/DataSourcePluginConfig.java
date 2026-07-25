
package io.yak.ops.dao.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;
import io.yak.ops.plugin.spi.enums.DbType;

@Data
@TableName("t_baize_flow_datasource_plugin_config")
@EqualsAndHashCode(callSuper = true)
public class DataSourcePluginConfig extends BaseEntity {

    /**
     * 插件类型
     */
    private DbType pluginType;

    /**
     * 数据库连接参数
     */
    private String configSchema;

}
