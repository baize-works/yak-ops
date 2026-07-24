
package io.baize.flow.dao.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;
import io.baize.flow.common.enums.ConnStatus;
import io.baize.flow.common.enums.EnvironmentEnum;
import io.baize.flow.plugin.spi.enums.DbType;


@Data
@TableName("t_baize_flow_datasource")
@EqualsAndHashCode(callSuper = true)
public class DataSource extends BaseEntity {

    /**
     * 数据源名称
     */
    private String name;

    /**
     * 数据源类型
     */
    private DbType dbType;

    /**
     * 数据库连接参数
     */
    private String connectionParams;

    /**
     * 原始json
     */
    private String originalJson;

    /**
     * 描述
     */
    private String remark;

    /**
     * 连接状态
     */
    private ConnStatus connStatus;

    /**
     * 环境
     */
    private EnvironmentEnum environment;
}
