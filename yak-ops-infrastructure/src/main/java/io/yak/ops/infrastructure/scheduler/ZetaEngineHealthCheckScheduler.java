package io.yak.ops.infrastructure.scheduler;

import javax.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import io.yak.ops.common.enums.LinkUpClientHealthStatusEnum;
import io.yak.ops.dao.entity.LinkUpClient;
import io.yak.ops.dao.repository.LinkUpClientDao;
import io.yak.ops.application.service.application.engine.HandleEngineHealthResultUseCase;
import io.yak.ops.application.service.application.job.CheckEngineHealthUseCase;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicInteger;

@Slf4j
@Component
public class ZetaEngineHealthCheckScheduler {

    @Resource
    private LinkUpClientDao linkUpClientDao;

    @Resource
    private CheckEngineHealthUseCase checkEngineHealthUseCase;

    @Resource
    private HandleEngineHealthResultUseCase engineHealthResultUseCase;

    @Value("${linkup.client.health-check.enabled:true}")
    private boolean enabled;

    @Value("${linkup.client.health-check.unhealthy-threshold:3}")
    private int unhealthyThreshold;

    private final ConcurrentMap<Long, AtomicInteger> failureCounter = new ConcurrentHashMap<>();

    @Scheduled(
            initialDelayString = "${linkup.client.health-check.initial-delay-ms:15000}",
            fixedDelayString = "${linkup.client.health-check.fixed-delay-ms:30000}"
    )
    public void checkZetaEngineHealth() {
        if (!enabled) {
            return;
        }

        List<LinkUpClient> clients = linkUpClientDao.listProbeClients();
        if (clients == null || clients.isEmpty()) {
            return;
        }

        for (LinkUpClient client : clients) {
            checkOneClient(client);
        }
    }

    private void checkOneClient(LinkUpClient client) {
        if (client == null || client.getId() == null) {
            return;
        }

        Long clientId = client.getId();

        try {
            /*
             * 使用 clientId 探活。
             * 连接信息由 application port 提供给 LinkUp adapter。
             */
            if (!checkEngineHealthUseCase.check(clientId)) { throw new IllegalStateException("Engine health probe reported unhealthy"); }

            failureCounter.remove(clientId);

            if (!Objects.equals(
                    client.getHealthStatus(),
                    LinkUpClientHealthStatusEnum.LIVE.getCode()
            )) {
                engineHealthResultUseCase.markLive(clientId);
                log.info("Zeta engine recovered, clientId={}, clientName={}",
                        clientId, client.getClientName());
            }
        } catch (Exception e) {
            handleProbeFailed(client, e);
        }
    }

    private void handleProbeFailed(LinkUpClient client, Exception e) {
        Long clientId = client.getId();

        int failedTimes = failureCounter
                .computeIfAbsent(clientId, key -> new AtomicInteger(0))
                .incrementAndGet();

        String reason = rootCauseMessage(e);

        if (failedTimes < unhealthyThreshold) {
            log.warn(
                    "Zeta engine health check failed, but threshold not reached, clientId={}, failedTimes={}, threshold={}, reason={}",
                    clientId,
                    failedTimes,
                    unhealthyThreshold,
                    reason
            );
            return;
        }

        boolean alreadyDead = Objects.equals(
                client.getHealthStatus(),
                LinkUpClientHealthStatusEnum.DEAD.getCode()
        );

        if (alreadyDead && failedTimes > unhealthyThreshold) {
            return;
        }

        String errorMessage = buildErrorMessage(client, reason);

        log.warn(
                "Zeta engine is unavailable, mark client dead and fail running instances, clientId={}, failedTimes={}, reason={}",
                clientId,
                failedTimes,
                reason
        );

        engineHealthResultUseCase.markDeadAndFailRunningExecutions(clientId, errorMessage);
    }

    private String buildErrorMessage(LinkUpClient client, String reason) {
        String clientName = client.getClientName();
        String baseUrl = client.getBaseUrl();

        return "Zeta Engine 探活失败，Web 端已将该 Client 下仍处于运行中的任务实例标记为 FAILED。"
                + " clientId=" + client.getId()
                + ", clientName=" + safe(clientName)
                + ", baseUrl=" + safe(baseUrl)
                + ", reason=" + safe(reason);
    }

    private String rootCauseMessage(Throwable throwable) {
        if (throwable == null) {
            return "unknown";
        }

        Throwable root = throwable;
        while (root.getCause() != null) {
            root = root.getCause();
        }

        String message = root.getMessage();
        if (StringUtils.isBlank(message)) {
            return root.getClass().getSimpleName();
        }

        return root.getClass().getSimpleName() + ": " + message;
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}
