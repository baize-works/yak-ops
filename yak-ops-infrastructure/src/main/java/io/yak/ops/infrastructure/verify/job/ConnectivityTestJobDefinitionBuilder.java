package io.yak.ops.infrastructure.verify.job;

import io.yak.ops.dao.entity.DataSource;
import io.yak.ops.dao.entity.LinkUpClient;
import io.yak.ops.plugin.spi.enums.DbType;

/**
 * Builder for datasource-specific connectivity test job definitions.
 */
public interface ConnectivityTestJobDefinitionBuilder {

    /**
     * Whether this builder supports the given datasource type.
     */
    boolean supports(DbType dbType);

    /**
     * Build a connectivity test job for the given client and datasource.
     */
    ConnectivityTestJob build(LinkUpClient client, DataSource datasource);
}
