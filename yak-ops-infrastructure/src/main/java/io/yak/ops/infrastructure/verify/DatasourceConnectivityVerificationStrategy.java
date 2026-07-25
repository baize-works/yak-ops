package io.yak.ops.infrastructure.verify;

import io.yak.ops.infrastructure.verify.modal.DatasourceVerifyContext;
import io.yak.ops.dao.entity.DataSource;
import io.yak.ops.dao.entity.SeaTunnelClient;
import io.yak.ops.application.model.vo.ClientDatasourceVerifyVO;
import io.yak.ops.plugin.spi.enums.DbType;

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
