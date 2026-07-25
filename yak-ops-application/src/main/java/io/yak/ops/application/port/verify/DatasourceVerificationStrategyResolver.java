package io.yak.ops.application.port.verify;

import io.yak.ops.application.port.verify.model.DatasourceVerifyContext;

/** Resolves the connectivity adapter supporting a verification request. */
public interface DatasourceVerificationStrategyResolver {
    DatasourceVerificationStrategy getStrategy(DatasourceVerifyContext context);
}
