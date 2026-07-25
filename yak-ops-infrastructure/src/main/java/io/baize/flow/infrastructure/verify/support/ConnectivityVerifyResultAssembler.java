package io.baize.flow.infrastructure.verify.support;

import io.baize.flow.infrastructure.verify.executor.JobExecutionResult;
import io.baize.flow.infrastructure.verify.job.ConnectivityTestJob;
import io.baize.flow.infrastructure.verify.resolver.ConnectivityErrorResolver;
import io.baize.flow.dao.entity.DataSource;
import io.baize.flow.dao.entity.SeaTunnelClient;
import io.baize.flow.web.contract.vo.ClientDatasourceVerifyVO;
import org.springframework.stereotype.Component;

import javax.annotation.Resource;

@Component
public class ConnectivityVerifyResultAssembler {

    @Resource
    private ConnectivityErrorResolver connectivityErrorResolver;

    public ClientDatasourceVerifyVO toVO(
            SeaTunnelClient client,
            DataSource datasource,
            ConnectivityTestJob job,
            JobExecutionResult executionResult) {

        ClientDatasourceVerifyVO vo = new ClientDatasourceVerifyVO();
        vo.setClientId(client.getId());
        vo.setClientName(client.getClientName());
        vo.setClientBaseUrl(client.getBaseUrl());
        vo.setDatasourceId(datasource.getId());
        vo.setDatasourceName(datasource.getName());
        vo.setDatasourceType(datasource.getDbType().toString());
        vo.setTestJobName(job.getJobName());
        vo.setTestJobId(executionResult.getJobId() == null ? null : String.valueOf(executionResult.getJobId()));
        vo.setFinalJobStatus(executionResult.getFinalStatus());
        vo.setDurationMs(executionResult.getDurationMs());
        vo.setSuccess(executionResult.isSuccess());

        if (executionResult.isSuccess()) {
            vo.setMessage("verification passed");
            vo.setErrorMessage(null);
        } else {
            vo.setMessage("Datasource connectivity verification failed");

            String resolved = executionResult.getErrorMessage();
            if (resolved == null || resolved.trim().isEmpty()) {
                resolved = connectivityErrorResolver.resolve(
                        executionResult.getRawLog(),
                        executionResult.getFinalStatus(),
                        datasource.getDbType()
                );
            }
            vo.setErrorMessage(resolved);
        }

        return vo;
    }
}
