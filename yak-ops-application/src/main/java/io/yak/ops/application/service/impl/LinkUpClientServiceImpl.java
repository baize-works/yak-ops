package io.yak.ops.application.service.impl;

import com.baomidou.mybatisplus.core.metadata.IPage;
import javax.annotation.Resource;
import io.yak.ops.application.service.LinkUpClientService;
import io.yak.ops.application.service.impl.client.LinkUpClientDatasourceVerifyAppService;
import io.yak.ops.application.service.impl.client.LinkUpClientLifecycleAppService;
import io.yak.ops.application.service.impl.client.LinkUpClientQueryAppService;
import io.yak.ops.application.service.impl.client.LinkUpClientRuntimeAppService;
import io.yak.ops.dao.entity.LinkUpClient;
import io.yak.ops.application.model.dto.ClientDatasourceVerifyDTO;
import io.yak.ops.application.model.dto.LinkUpClientDTO;
import io.yak.ops.application.model.dto.LinkUpClientEndpointDTO;
import io.yak.ops.application.model.dto.LinkUpClientPageDTO;
import io.yak.ops.application.model.vo.ClientDatasourceVerifyVO;
import io.yak.ops.application.model.vo.OptionVO;
import io.yak.ops.application.model.vo.LinkUpClientMetricsVO;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class LinkUpClientServiceImpl implements LinkUpClientService {

    @Resource
    private LinkUpClientLifecycleAppService lifecycleAppService;

    @Resource
    private LinkUpClientQueryAppService queryAppService;

    @Resource
    private LinkUpClientRuntimeAppService runtimeAppService;

    @Resource
    private LinkUpClientDatasourceVerifyAppService datasourceVerifyAppService;

    @Override
    public void saveOrUpdate(LinkUpClientDTO dto) {
        lifecycleAppService.saveOrUpdate(dto);
    }

    @Override
    public void deleteById(Long id) {
        lifecycleAppService.deleteById(id);
    }

    @Override
    public List<LinkUpClientEndpointDTO> refreshNodes(Long clientId) {
        return lifecycleAppService.refreshNodes(clientId);
    }

    @Override
    public List<OptionVO> option() {
        return queryAppService.option();
    }

    @Override
    public IPage<LinkUpClient> page(LinkUpClientPageDTO dto) {
        return queryAppService.page(dto);
    }

    @Override
    public List<LinkUpClientEndpointDTO> nodes(Long clientId) {
        return queryAppService.nodes(clientId);
    }

    @Override
    public LinkUpClientMetricsVO metrics(Long id) {
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
