package io.yak.ops.application.port.verify;

import io.yak.ops.application.model.vo.ClientDatasourceVerifyVO;
import io.yak.ops.application.port.verify.model.DatasourceVerifyContext;

/** Adapter contract for a concrete datasource connectivity mechanism. */
public interface DatasourceVerificationStrategy {
    boolean supports(DatasourceVerifyContext context);
    ClientDatasourceVerifyVO verify(DatasourceVerifyContext context);
}
