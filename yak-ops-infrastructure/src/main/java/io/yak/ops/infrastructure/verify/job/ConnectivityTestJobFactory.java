package io.yak.ops.infrastructure.verify.job;

import io.yak.ops.dao.entity.DataSource;
import io.yak.ops.dao.entity.LinkUpClient;

/**
 * Factory for building connectivity test jobs.
 */
public interface ConnectivityTestJobFactory {

    /**
     * Build a test job for the given client and datasource.
     */
    ConnectivityTestJob build(LinkUpClient client, DataSource datasource);
}
