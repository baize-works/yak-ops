package io.baize.flow.infrastructure.verify;

import io.baize.flow.infrastructure.verify.modal.DatasourceVerifyContext;
import io.baize.flow.dao.entity.DataSource;
import io.baize.flow.dao.entity.SeaTunnelClient;
import io.baize.flow.web.contract.vo.ClientDatasourceVerifyVO;
import io.baize.flow.plugin.spi.enums.DbType;

/**
 * Strategy interface for verifying datasource connectivity from a specific client.
 */
public interface DatasourceConnectivityVerificationStrategy {

    /**
     * Whether this strategy supports the given datasource type.
     */
    boolean supports(DatasourceVerifyContext context);

    /**
     * Verify connectivity between the client and datasource.
     *
     * @return verification result
     */
    ClientDatasourceVerifyVO verify(DatasourceVerifyContext context);
}