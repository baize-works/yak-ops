package io.yak.ops.web.contract.vo;


import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import io.yak.ops.common.enums.ConnStatus;
import io.yak.ops.common.enums.EnvironmentEnum;
import io.yak.ops.plugin.spi.enums.DbType;

import java.util.Date;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class DataSourceVO {

    private Long id;

    private String name;

    private DbType dbType;

    private String jdbcUrl;

    private String remark;

    private String connectionParams;

    private String originalJson;

    private ConnStatus connStatus;

    private EnvironmentEnum environment;

    private String environmentName;

    @JsonFormat(pattern = "yyyy/MM/dd HH:mm:ss", timezone = "GMT+8")
    private Date createTime;

    @JsonFormat(pattern = "yyyy/MM/dd HH:mm:ss", timezone = "GMT+8")
    private Date updateTime;

}
