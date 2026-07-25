package io.yak.ops.application.service.impl.client;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import javax.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import io.yak.ops.common.enums.SeaTunnelClientHealthStatusEnum;
import io.yak.ops.common.enums.SeaTunnelClientNodeRole;
import io.yak.ops.domain.exceptions.ServiceException;
import io.yak.ops.dao.entity.SeaTunnelClient;
import io.yak.ops.dao.entity.SeaTunnelClientNode;
import io.yak.ops.dao.repository.SeaTunnelClientDao;
import io.yak.ops.dao.repository.SeaTunnelClientNodeDao;
import io.yak.ops.web.contract.dto.SeaTunnelClientEndpointDTO;
import io.yak.ops.dao.model.result.SeaTunnelClientEndpoint;
import io.yak.ops.web.contract.dto.SeaTunnelClientPageDTO;
import io.yak.ops.web.contract.vo.OptionVO;
import io.yak.ops.plugin.spi.enums.Status;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Application service for querying SeaTunnel clients.
 *
 * <p>This service is responsible for client option loading, paginated client query,
 * and endpoint query. It only handles read-side application logic and does not change
 * client runtime state.</p>
 */
@Service
public class SeaTunnelClientQueryAppService {

    @Resource
    private SeaTunnelClientDao seaTunnelClientDao;

    @Resource
    private SeaTunnelClientNodeDao seaTunnelClientNodeDao;

    @Resource
    private SeaTunnelClientAssembler assembler;

    /**
     * Returns available SeaTunnel client options.
     *
     * <p>Only LIVE clients are returned here because these options are mainly used by
     * job configuration pages, where users should select an available runtime client.</p>
     *
     * @return available client options
     */
    public List<OptionVO> option() {
        LambdaQueryWrapper<SeaTunnelClient> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(
                SeaTunnelClient::getHealthStatus,
                SeaTunnelClientHealthStatusEnum.LIVE.getCode()
        );
        wrapper.orderByDesc(SeaTunnelClient::getCreateTime);

        List<SeaTunnelClient> entities = seaTunnelClientDao.selectList(wrapper);

        if (entities == null || entities.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        return entities.stream()
                .map(assembler::toOptionVO)
                .collect(java.util.stream.Collectors.toList());
    }

    /**
     * Queries SeaTunnel clients by page.
     *
     * <p>The returned client records will be enriched with master and worker endpoint
     * information so that the frontend can display the client topology directly.</p>
     *
     * @param dto page query request
     * @return paginated SeaTunnel clients
     */
    public IPage<SeaTunnelClient> page(SeaTunnelClientPageDTO dto) {
        int pageNo = dto == null || dto.getPageNo() == null || dto.getPageNo() <= 0
                ? 1
                : dto.getPageNo();

        int pageSize = dto == null || dto.getPageSize() == null || dto.getPageSize() <= 0
                ? 10
                : dto.getPageSize();

        LambdaQueryWrapper<SeaTunnelClient> wrapper = new LambdaQueryWrapper<>();
        wrapper.orderByDesc(SeaTunnelClient::getCreateTime);

        IPage<SeaTunnelClient> page =
                seaTunnelClientDao.selectPage(new Page<>(pageNo, pageSize), wrapper);

        fillClientNodes(page.getRecords());

        return page;
    }

    /**
     * Returns all configured endpoints of a SeaTunnel client.
     *
     * @param clientId SeaTunnel client id
     * @return client endpoint list
     */
    public List<SeaTunnelClientEndpointDTO> nodes(Long clientId) {
        getEntity(clientId);

        List<SeaTunnelClientNode> nodes =
                seaTunnelClientNodeDao.selectByClientId(clientId);

        if (nodes == null || nodes.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        return nodes.stream()
                .map(assembler::toEndpointDTO)
                .collect(java.util.stream.Collectors.toList());
    }

    /**
     * Fills master and worker endpoint lists for each client record.
     *
     * <p>This method groups persisted nodes by node role and attaches them to the
     * corresponding client entity for frontend rendering.</p>
     */
    private void fillClientNodes(List<SeaTunnelClient> clients) {
        if (clients == null || clients.isEmpty()) {
            return;
        }

        for (SeaTunnelClient client : clients) {
            List<SeaTunnelClientNode> nodes =
                    seaTunnelClientNodeDao.selectByClientId(client.getId());

            if (nodes == null || nodes.isEmpty()) {
                client.setMasterEndpoints(java.util.Collections.emptyList());
                client.setWorkerEndpoints(java.util.Collections.emptyList());
                continue;
            }

            List<SeaTunnelClientEndpoint> masters = nodes.stream()
                    .filter(node -> StringUtils.equalsIgnoreCase(
                            node.getNodeRole(),
                            SeaTunnelClientNodeRole.MASTER
                    ))
                    .map(assembler::toPersistenceEndpoint)
                    .collect(java.util.stream.Collectors.toList());

            List<SeaTunnelClientEndpoint> workers = nodes.stream()
                    .filter(node -> StringUtils.equalsIgnoreCase(
                            node.getNodeRole(),
                            SeaTunnelClientNodeRole.WORKER
                    ))
                    .map(assembler::toPersistenceEndpoint)
                    .collect(java.util.stream.Collectors.toList());

            client.setMasterEndpoints(masters);
            client.setWorkerEndpoints(workers);
        }
    }

    /**
     * Gets an existing SeaTunnel client entity by id.
     *
     * @param id SeaTunnel client id
     * @return existing SeaTunnel client entity
     */
    private SeaTunnelClient getEntity(Long id) {
        if (id == null) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "客户端 ID 不能为空"
            );
        }

        SeaTunnelClient entity = seaTunnelClientDao.queryById(id);

        if (entity == null) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "客户端不存在, id=" + id
            );
        }

        return entity;
    }
}
