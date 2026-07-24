package io.baize.flow.infrastructure.verify.modal;

import lombok.Builder;
import lombok.Data;
import io.baize.flow.dao.entity.DataSource;
import io.baize.flow.dao.entity.SeaTunnelClient;
import io.baize.flow.plugin.spi.enums.DbType;

@Data
@Builder
public class DatasourceVerifyContext {

    private SeaTunnelClient client;

    private DataSource datasource;

    private DbType dbType;

    private String pluginName;

    private String connectorType;

    private String role;

    private long timeoutMs;

    private long pollIntervalMs;
}