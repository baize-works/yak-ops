package io.yak.ops.dao.repository;

import io.yak.ops.dao.entity.LinkUpClient;

import java.util.Date;
import java.util.List;

public interface LinkUpClientDao extends IDao<LinkUpClient> {

    LinkUpClient selectById(Long clientId);

    List<LinkUpClient> listProbeClients();

    int updateHealthStatus(Long clientId, Integer healthStatus, Date heartbeatTime);
}
