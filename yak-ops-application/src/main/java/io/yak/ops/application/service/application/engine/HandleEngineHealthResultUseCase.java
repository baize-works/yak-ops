package io.yak.ops.application.service.application.engine;

import io.yak.ops.common.enums.LinkUpClientHealthStatusEnum;
import io.yak.ops.dao.repository.JobInstanceDao;
import io.yak.ops.dao.repository.LinkUpClientDao;
import java.util.Date;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Applies engine health outcomes to local client and execution state. */
@Component
public class HandleEngineHealthResultUseCase {
    private final LinkUpClientDao clients;
    private final JobInstanceDao instances;
    public HandleEngineHealthResultUseCase(LinkUpClientDao clients, JobInstanceDao instances) { this.clients = clients; this.instances = instances; }
    @Transactional(rollbackFor = Exception.class)
    public void markLive(Long clientId) { clients.updateHealthStatus(clientId, LinkUpClientHealthStatusEnum.LIVE.getCode(), new Date()); }
    @Transactional(rollbackFor = Exception.class)
    public int markDeadAndFailRunningExecutions(Long clientId, String errorMessage) {
        clients.updateHealthStatus(clientId, LinkUpClientHealthStatusEnum.DEAD.getCode(), null);
        return instances.failRunningInstancesByClientId(clientId, errorMessage);
    }
}
