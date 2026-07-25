package io.yak.ops.infrastructure.verify.modal;

import lombok.Builder;
import lombok.Data;
import io.yak.ops.dao.entity.DataSource;
import io.yak.ops.dao.entity.SeaTunnelClient;
import io.yak.ops.plugin.spi.enums.DbType;

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
