package io.baize.flow.infrastructure.verify.job;

import io.baize.flow.dao.entity.DataSource;
import io.baize.flow.dao.entity.SeaTunnelClient;

/**
 * Factory for building connectivity test jobs.
 */
public interface ConnectivityTestJobFactory {

    /**
     * Build a test job for the given client and datasource.
     */
    ConnectivityTestJob build(SeaTunnelClient client, DataSource datasource);
}
