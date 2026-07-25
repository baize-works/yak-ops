package io.yak.ops.application.service.application.engine;

import io.yak.ops.common.enums.SeaTunnelClientHealthStatusEnum;
import io.yak.ops.dao.repository.JobInstanceDao;
import io.yak.ops.dao.repository.SeaTunnelClientDao;
import java.util.Date;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Applies engine health outcomes to local client and execution state. */
@Component
public class HandleEngineHealthResultUseCase {
    private final SeaTunnelClientDao clients;
    private final JobInstanceDao instances;
    public HandleEngineHealthResultUseCase(SeaTunnelClientDao clients, JobInstanceDao instances) { this.clients = clients; this.instances = instances; }
    @Transactional(rollbackFor = Exception.class)
    public void markLive(Long clientId) { clients.updateHealthStatus(clientId, SeaTunnelClientHealthStatusEnum.LIVE.getCode(), new Date()); }
    @Transactional(rollbackFor = Exception.class)
    public int markDeadAndFailRunningExecutions(Long clientId, String errorMessage) {
        clients.updateHealthStatus(clientId, SeaTunnelClientHealthStatusEnum.DEAD.getCode(), null);
        return instances.failRunningInstancesByClientId(clientId, errorMessage);
    }
}
