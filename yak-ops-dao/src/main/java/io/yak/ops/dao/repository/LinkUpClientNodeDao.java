package io.yak.ops.dao.repository;

import io.yak.ops.dao.entity.LinkUpClientNode;

import java.util.List;

public interface LinkUpClientNodeDao extends IDao<LinkUpClientNode> {

    List<LinkUpClientNode> selectByClientId(Long clientId);

    List<LinkUpClientNode> selectByClientIdAndRole(
            Long clientId,
            String nodeRole
    );

    void deleteByClientId(Long clientId);

    void clearActiveMaster(Long clientId);
}
