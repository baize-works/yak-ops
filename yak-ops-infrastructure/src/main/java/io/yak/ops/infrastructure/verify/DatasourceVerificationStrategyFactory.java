package io.yak.ops.infrastructure.verify;
import io.yak.ops.application.port.verify.DatasourceVerificationStrategy;
import io.yak.ops.application.port.verify.DatasourceVerificationStrategyResolver;

import javax.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import io.yak.ops.domain.exceptions.ServiceException;
import io.yak.ops.application.port.verify.model.DatasourceVerifyContext;
import io.yak.ops.plugin.spi.enums.Status;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DatasourceVerificationStrategyFactory implements DatasourceVerificationStrategyResolver {

    @Resource
    private List<DatasourceVerificationStrategy> strategies;

    public DatasourceVerificationStrategy getStrategy(DatasourceVerifyContext context) {
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
