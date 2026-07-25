package io.yak.ops.application.port.verify.model;

import io.yak.ops.dao.entity.DataSource;
import io.yak.ops.dao.entity.LinkUpClient;
import io.yak.ops.plugin.spi.enums.DbType;
import lombok.Builder;
import lombok.Data;

/** Input needed by datasource connectivity adapters. */
@Data
@Builder
public class DatasourceVerifyContext {
    private LinkUpClient client;
    private DataSource datasource;
    private DbType dbType;
    private String pluginName;
    private String connectorType;
    private String role;
    private long timeoutMs;
    private long pollIntervalMs;
}
