package io.baize.flow.api.service.impl;

import com.baomidou.mybatisplus.core.metadata.IPage;
import jakarta.annotation.Resource;
import io.baize.flow.api.service.SeaTunnelClientService;
import io.baize.flow.api.service.impl.client.SeaTunnelClientDatasourceVerifyAppService;
import io.baize.flow.api.service.impl.client.SeaTunnelClientLifecycleAppService;
import io.baize.flow.api.service.impl.client.SeaTunnelClientQueryAppService;
import io.baize.flow.api.service.impl.client.SeaTunnelClientRuntimeAppService;
import io.baize.flow.dao.entity.SeaTunnelClient;
import io.baize.flow.web.contract.dto.ClientDatasourceVerifyDTO;
import io.baize.flow.web.contract.dto.SeaTunnelClientDTO;
import io.baize.flow.web.contract.dto.SeaTunnelClientEndpointDTO;
import io.baize.flow.web.contract.dto.SeaTunnelClientPageDTO;
import io.baize.flow.web.contract.vo.ClientDatasourceVerifyVO;
import io.baize.flow.web.contract.vo.OptionVO;
import io.baize.flow.web.contract.vo.SeaTunnelClientMetricsVO;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class SeaTunnelClientServiceImpl implements SeaTunnelClientService {

    @Resource
    private SeaTunnelClientLifecycleAppService lifecycleAppService;

    @Resource
    private SeaTunnelClientQueryAppService queryAppService;

    @Resource
    private SeaTunnelClientRuntimeAppService runtimeAppService;

    @Resource
    private SeaTunnelClientDatasourceVerifyAppService datasourceVerifyAppService;

    @Override
    public void saveOrUpdate(SeaTunnelClientDTO dto) {
        lifecycleAppService.saveOrUpdate(dto);
    }

    @Override
    public void deleteById(Long id) {
        lifecycleAppService.deleteById(id);
    }

    @Override
    public List<SeaTunnelClientEndpointDTO> refreshNodes(Long clientId) {
        return lifecycleAppService.refreshNodes(clientId);
    }

    @Override
    public List<OptionVO> option() {
        return queryAppService.option();
    }

    @Override
    public IPage<SeaTunnelClient> page(SeaTunnelClientPageDTO dto) {
        return queryAppService.page(dto);
    }

    @Override
    public List<SeaTunnelClientEndpointDTO> nodes(Long clientId) {
        return queryAppService.nodes(clientId);
    }

    @Override
    public SeaTunnelClientMetricsVO metrics(Long id) {
        return runtimeAppService.metrics(id);
    }

    @Override
    public String logsByInstanceId(Long instanceId, String jobMode) {
        return runtimeAppService.logsByInstanceId(instanceId, jobMode);
    }

    @Override
    public Map<String, Object> checkpointOverview(Long clientId, Long jobId) {
        return runtimeAppService.checkpointOverview(clientId, jobId);
    }

    @Override
    public List<Map<String, Object>> checkpointHistory(
            Long clientId,
            Long jobId,
            Long pipelineId,
            Integer limit,
            String status
    ) {
        return runtimeAppService.checkpointHistory(
                clientId,
                jobId,
                pipelineId,
                limit,
                status
        );
    }

    @Override
    public ClientDatasourceVerifyVO verifyDatasource(
            Long clientId,
            ClientDatasourceVerifyDTO dto
    ) {
        return datasourceVerifyAppService.verifyDatasource(clientId, dto);
    }
}