package io.baize.flow.application.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import io.baize.flow.dao.entity.SeaTunnelClient;
import io.baize.flow.web.contract.dto.ClientDatasourceVerifyDTO;
import io.baize.flow.web.contract.dto.SeaTunnelClientDTO;
import io.baize.flow.web.contract.dto.SeaTunnelClientEndpointDTO;
import io.baize.flow.web.contract.dto.SeaTunnelClientPageDTO;
import io.baize.flow.web.contract.vo.*;

import java.util.List;
import java.util.Map;

public interface SeaTunnelClientService {

    void saveOrUpdate(SeaTunnelClientDTO dto);

    SeaTunnelClientMetricsVO metrics(Long id);

     List<OptionVO> option();

    IPage<SeaTunnelClient> page(SeaTunnelClientPageDTO dto);

    ClientDatasourceVerifyVO verifyDatasource(Long clientId, ClientDatasourceVerifyDTO dto);

    void deleteById(Long id);

    String logsByInstanceId(Long instanceId, String jobMode);

    Map<String, Object> checkpointOverview(Long clientId, Long jobId);

    List<Map<String, Object>> checkpointHistory(
            Long clientId,
            Long jobId,
            Long pipelineId,
            Integer limit,
            String status
    );

    List<SeaTunnelClientEndpointDTO> nodes(Long clientId);

    List<SeaTunnelClientEndpointDTO> refreshNodes(Long clientId);
}
