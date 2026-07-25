package io.baize.flow.infrastructure.verify;

import javax.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import io.baize.flow.domain.exceptions.ServiceException;
import io.baize.flow.infrastructure.verify.modal.DatasourceVerifyContext;
import io.baize.flow.plugin.spi.enums.Status;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DatasourceConnectivityVerificationStrategyFactory {

    @Resource
    private List<DatasourceConnectivityVerificationStrategy> strategies;

    public DatasourceConnectivityVerificationStrategy getStrategy(DatasourceVerifyContext context) {
        if (context == null) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "数据源测试上下文不能为空"
            );
        }

        return strategies.stream()
                .filter(strategy -> strategy.supports(context))
                .findFirst()
                .orElseThrow(() -> new ServiceException(
                        Status.INTERNAL_SERVER_ERROR_ARGS,
                        buildUnsupportedMessage(context)
                ));
    }

    private String buildUnsupportedMessage(DatasourceVerifyContext context) {
        return "暂不支持该数据源测试类型: dbType="
                + context.getDbType()
                + ", pluginName="
                + StringUtils.defaultIfBlank(context.getPluginName(), "-")
                + ", role="
                + StringUtils.defaultIfBlank(context.getRole(), "-");
    }
}
