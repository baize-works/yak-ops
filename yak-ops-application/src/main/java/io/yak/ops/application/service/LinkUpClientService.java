package io.yak.ops.application.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import io.yak.ops.dao.entity.LinkUpClient;
import io.yak.ops.application.model.dto.ClientDatasourceVerifyDTO;
import io.yak.ops.application.model.dto.LinkUpClientDTO;
import io.yak.ops.application.model.dto.LinkUpClientEndpointDTO;
import io.yak.ops.application.model.dto.LinkUpClientPageDTO;
import io.yak.ops.application.model.vo.*;

import java.util.List;
import java.util.Map;

public interface LinkUpClientService {

    void saveOrUpdate(LinkUpClientDTO dto);

    LinkUpClientMetricsVO metrics(Long id);

     List<OptionVO> option();

    IPage<LinkUpClient> page(LinkUpClientPageDTO dto);

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

    List<LinkUpClientEndpointDTO> nodes(Long clientId);

    List<LinkUpClientEndpointDTO> refreshNodes(Long clientId);
}
