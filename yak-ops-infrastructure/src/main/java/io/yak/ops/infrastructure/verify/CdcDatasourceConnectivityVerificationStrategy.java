package io.yak.ops.infrastructure.verify;

import javax.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.cdc.CdcDatasourcePrecheckItem;
import org.apache.seatunnel.plugin.datasource.api.cdc.CdcDatasourcePrecheckProvider;
import org.apache.seatunnel.plugin.datasource.api.cdc.CdcDatasourcePrecheckProviderFactory;
import org.apache.seatunnel.plugin.datasource.api.cdc.CdcDatasourcePrecheckResult;
import io.yak.ops.infrastructure.verify.modal.DatasourceVerifyContext;
import io.yak.ops.application.model.vo.ClientDatasourceVerifyItemVO;
import io.yak.ops.application.model.vo.ClientDatasourceVerifyVO;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class CdcDatasourceConnectivityVerificationStrategy
        implements DatasourceConnectivityVerificationStrategy {

    @Resource
    private JdbcDatasourceConnectivityVerificationStrategy jdbcDatasourceConnectivityVerificationStrategy;

    @Override
    public boolean supports(DatasourceVerifyContext context) {
        return context != null
                && StringUtils.containsIgnoreCase(context.getPluginName(), "CDC");
    }

    @Override
    public ClientDatasourceVerifyVO verify(DatasourceVerifyContext context) {
        if (!StringUtils.equalsIgnoreCase(context.getRole(), "SOURCE")) {
            ClientDatasourceVerifyVO vo = ClientDatasourceVerifyVO.fail("CDC 插件只能作为来源端使用");
            vo.addItem(ClientDatasourceVerifyItemVO.fail(
                    "CDC_ROLE",
                    "CDC 使用位置",
                    StringUtils.defaultIfBlank(context.getRole(), "-"),
                    "SOURCE",
                    "CDC 插件只能作为来源端使用"
            ));
            return vo;
        }

        List<ClientDatasourceVerifyItemVO> allItems = new ArrayList<>();

        ClientDatasourceVerifyVO jdbcResult =
                jdbcDatasourceConnectivityVerificationStrategy.doVerify(context);

        if (jdbcResult.getItems() != null) {
            allItems.addAll(jdbcResult.getItems());
        }

        if (!Boolean.TRUE.equals(jdbcResult.getSuccess())) {
            ClientDatasourceVerifyVO vo = ClientDatasourceVerifyVO.fail(
                    StringUtils.defaultIfBlank(
                            jdbcResult.getMessage(),
                            "基础连通性测试失败，未继续执行 CDC 前置校验"
                    )
            );
            vo.setFinalJobStatus(jdbcResult.getFinalJobStatus());
            vo.setDurationMs(jdbcResult.getDurationMs());
            vo.setTestJobId(jdbcResult.getTestJobId());
            vo.setItems(allItems);
            return vo;
        }

        CdcDatasourcePrecheckProvider provider =
                CdcDatasourcePrecheckProviderFactory.getProvider(
                        context.getDbType(),
                        context.getPluginName()
                );

        CdcDatasourcePrecheckResult cdcResult =
                provider.check(context.getDatasource().getConnectionParams());

        if (cdcResult.getItems() != null) {
            for (CdcDatasourcePrecheckItem item : cdcResult.getItems()) {
                allItems.add(convertItem(item));
            }
        }

        boolean success = Boolean.TRUE.equals(jdbcResult.getSuccess())
                && cdcResult.isSuccess();

        ClientDatasourceVerifyVO vo = new ClientDatasourceVerifyVO();
        vo.setSuccess(success);
        vo.setMessage(success
                ? "CDC 校验通过，基础连通性和前置条件均正常"
                : "CDC 校验未通过，请查看检查项详情");
        vo.setErrorMessage(success ? null : vo.getMessage());
        vo.setFinalJobStatus(jdbcResult.getFinalJobStatus());
        vo.setDurationMs(jdbcResult.getDurationMs());
        vo.setTestJobId(jdbcResult.getTestJobId());
        vo.setItems(allItems);

        return vo;
    }

    private ClientDatasourceVerifyItemVO convertItem(CdcDatasourcePrecheckItem item) {
        ClientDatasourceVerifyItemVO vo = new ClientDatasourceVerifyItemVO();
        vo.setCode(item.getCode());
        vo.setName(item.getName());
        vo.setSuccess(item.getSuccess());
        vo.setActualValue(item.getActualValue());
        vo.setExpectedValue(item.getExpectedValue());
        vo.setMessage(item.getMessage());
        return vo;
    }
}
