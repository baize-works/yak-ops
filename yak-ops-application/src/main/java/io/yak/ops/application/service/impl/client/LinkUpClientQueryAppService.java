package io.yak.ops.application.service.impl.client;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import javax.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import io.yak.ops.common.enums.LinkUpClientHealthStatusEnum;
import io.yak.ops.common.enums.LinkUpClientNodeRole;
import io.yak.ops.domain.exceptions.ServiceException;
import io.yak.ops.dao.entity.LinkUpClient;
import io.yak.ops.dao.entity.LinkUpClientNode;
import io.yak.ops.dao.repository.LinkUpClientDao;
import io.yak.ops.dao.repository.LinkUpClientNodeDao;
import io.yak.ops.application.model.dto.LinkUpClientEndpointDTO;
import io.yak.ops.dao.model.result.LinkUpClientEndpoint;
import io.yak.ops.application.model.dto.LinkUpClientPageDTO;
import io.yak.ops.application.model.vo.OptionVO;
import io.yak.ops.plugin.spi.enums.Status;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Application service for querying LinkUp clients.
 *
 * <p>This service is responsible for client option loading, paginated client query,
 * and endpoint query. It only handles read-side application logic and does not change
 * client runtime state.</p>
 */
@Service
public class LinkUpClientQueryAppService {

    @Resource
    private LinkUpClientDao linkUpClientDao;

    @Resource
    private LinkUpClientNodeDao linkUpClientNodeDao;

    @Resource
    private LinkUpClientAssembler assembler;

    /**
     * Returns available LinkUp client options.
     *
     * <p>Only LIVE clients are returned here because these options are mainly used by
     * job configuration pages, where users should select an available runtime client.</p>
     *
     * @return available client options
     */
    public List<OptionVO> option() {
        LambdaQueryWrapper<LinkUpClient> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(
                LinkUpClient::getHealthStatus,
                LinkUpClientHealthStatusEnum.LIVE.getCode()
        );
        wrapper.orderByDesc(LinkUpClient::getCreateTime);

        List<LinkUpClient> entities = linkUpClientDao.selectList(wrapper);

        if (entities == null || entities.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        return entities.stream()
                .map(assembler::toOptionVO)
                .collect(java.util.stream.Collectors.toList());
    }

    /**
     * Queries LinkUp clients by page.
     *
     * <p>The returned client records will be enriched with master and worker endpoint
     * information so that the frontend can display the client topology directly.</p>
     *
     * @param dto page query request
     * @return paginated LinkUp clients
     */
    public IPage<LinkUpClient> page(LinkUpClientPageDTO dto) {
        int pageNo = dto == null || dto.getPageNo() == null || dto.getPageNo() <= 0
                ? 1
                : dto.getPageNo();

        int pageSize = dto == null || dto.getPageSize() == null || dto.getPageSize() <= 0
                ? 10
                : dto.getPageSize();

        LambdaQueryWrapper<LinkUpClient> wrapper = new LambdaQueryWrapper<>();
        wrapper.orderByDesc(LinkUpClient::getCreateTime);

        IPage<LinkUpClient> page =
                linkUpClientDao.selectPage(new Page<>(pageNo, pageSize), wrapper);

        fillClientNodes(page.getRecords());

        return page;
    }

    /**
     * Returns all configured endpoints of a LinkUp client.
     *
     * @param clientId LinkUp client id
     * @return client endpoint list
     */
    public List<LinkUpClientEndpointDTO> nodes(Long clientId) {
        getEntity(clientId);

        List<LinkUpClientNode> nodes =
                linkUpClientNodeDao.selectByClientId(clientId);

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
    private void fillClientNodes(List<LinkUpClient> clients) {
        if (clients == null || clients.isEmpty()) {
            return;
        }

        for (LinkUpClient client : clients) {
            List<LinkUpClientNode> nodes =
                    linkUpClientNodeDao.selectByClientId(client.getId());

            if (nodes == null || nodes.isEmpty()) {
                client.setMasterEndpoints(java.util.Collections.emptyList());
                client.setWorkerEndpoints(java.util.Collections.emptyList());
                continue;
            }

            List<LinkUpClientEndpoint> masters = nodes.stream()
                    .filter(node -> StringUtils.equalsIgnoreCase(
                            node.getNodeRole(),
                            LinkUpClientNodeRole.MASTER
                    ))
                    .map(assembler::toPersistenceEndpoint)
                    .collect(java.util.stream.Collectors.toList());

            List<LinkUpClientEndpoint> workers = nodes.stream()
                    .filter(node -> StringUtils.equalsIgnoreCase(
                            node.getNodeRole(),
                            LinkUpClientNodeRole.WORKER
                    ))
                    .map(assembler::toPersistenceEndpoint)
                    .collect(java.util.stream.Collectors.toList());

            client.setMasterEndpoints(masters);
            client.setWorkerEndpoints(workers);
        }
    }

    /**
     * Gets an existing LinkUp client entity by id.
     *
     * @param id LinkUp client id
     * @return existing LinkUp client entity
     */
    private LinkUpClient getEntity(Long id) {
        if (id == null) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "客户端 ID 不能为空"
            );
        }

        LinkUpClient entity = linkUpClientDao.queryById(id);

        if (entity == null) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "客户端不存在, id=" + id
            );
        }

        return entity;
    }
}
