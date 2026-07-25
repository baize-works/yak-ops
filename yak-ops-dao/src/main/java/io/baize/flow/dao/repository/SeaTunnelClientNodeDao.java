package io.baize.flow.dao.repository;

import io.baize.flow.dao.entity.SeaTunnelClientNode;

import java.util.List;

public interface SeaTunnelClientNodeDao extends IDao<SeaTunnelClientNode> {

    List<SeaTunnelClientNode> selectByClientId(Long clientId);

    List<SeaTunnelClientNode> selectByClientIdAndRole(
            Long clientId,
            String nodeRole
    );

    void deleteByClientId(Long clientId);

    void clearActiveMaster(Long clientId);
}
