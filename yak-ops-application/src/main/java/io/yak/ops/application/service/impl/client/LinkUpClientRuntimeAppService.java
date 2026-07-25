package io.yak.ops.application.service.impl.client;

import javax.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import io.yak.ops.domain.exceptions.ServiceException;
import io.yak.ops.application.support.utils.MetricValueParser;
import io.yak.ops.dao.entity.JobInstance;
import io.yak.ops.dao.entity.LinkUpClient;
import io.yak.ops.dao.repository.JobInstanceDao;
import io.yak.ops.dao.repository.LinkUpClientDao;
import io.yak.ops.engine.api.EngineClientPort;
import io.yak.ops.application.model.vo.LinkUpClientMetricsVO;
import io.yak.ops.plugin.spi.enums.Status;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Application service for querying LinkUp client runtime information.
 *
 * <p>This service is responsible for loading runtime metrics, job logs,
 * checkpoint overview, and checkpoint history from the LinkUp engine.</p>
 *
 * <p>The service resolves batch job instances before querying engine-side logs.</p>
 */
@Service
public class LinkUpClientRuntimeAppService {

    @Resource
    private LinkUpClientDao linkUpClientDao;

    @Resource
    private JobInstanceDao jobInstanceDao;


    @Resource
    private EngineClientPort linkUpRestClient;

    /**
     * Queries runtime metrics of a LinkUp client.
     *
     * <p>The raw metrics returned by LinkUp engine are parsed into frontend-friendly
     * fields, such as CPU usage, memory usage, thread count, and running operation count.</p>
     *
     * @param id LinkUp client id
     * @return parsed client metrics
     */
    public LinkUpClientMetricsVO metrics(Long id) {
        getEntity(id);

        List<Map<String, Object>> metricsList =
                linkUpRestClient.systemMonitoringInformation(id);

        Map<String, Object> metricMap =
                metricsList == null || metricsList.isEmpty() ? null : metricsList.get(0);

        Double cpuUsage = MetricValueParser.parsePercent(
                metricMap == null ? null : metricMap.get("load.system")
        );
        Double memoryUsage = MetricValueParser.parsePercent(
                metricMap == null ? null : metricMap.get("heap.memory.used/total")
        );
        Integer threadCount = MetricValueParser.parseInteger(
                metricMap == null ? null : metricMap.get("thread.count")
        );
        Integer runningOps = MetricValueParser.parseInteger(
                metricMap == null ? null : metricMap.get("operations.running.count")
        );

        return new LinkUpClientMetricsVO(
                cpuUsage,
                memoryUsage,
                threadCount,
                runningOps
        );
    }

    /**
     * Queries engine logs by job instance id.
     *
     * @param instanceId batch job instance id
     * @param jobMode optional job mode (BATCH)
     * @return engine log content in JSON format
     */
    public String logsByInstanceId(Long instanceId, String jobMode) {
        if (instanceId == null) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "instanceId 不能为空"
            );
        }

        JobInstance offlineInstance = jobInstanceDao.queryById(instanceId);
        if (offlineInstance != null) {
            return getEngineLogs(
                    offlineInstance.getClientId(),
                    offlineInstance.getEngineJobId(),
                    "BATCH",
                    instanceId
            );
        }


        throw new ServiceException(
                Status.INTERNAL_SERVER_ERROR_ARGS,
                "任务实例不存在, instanceId=" + instanceId
        );
    }

    /**
     * Queries checkpoint overview of a running LinkUp job.
     *
     * @param clientId LinkUp client id
     * @param jobId LinkUp engine job id
     * @return checkpoint overview returned by LinkUp engine
     */
    public Map<String, Object> checkpointOverview(
            Long clientId,
            Long jobId
    ) {
        checkClientAndJob(clientId, jobId);
        return linkUpRestClient.checkpointOverview(clientId, jobId);
    }

    /**
     * Queries checkpoint history of a running LinkUp job.
     *
     * <p>The query limit is normalized to avoid invalid or excessively large requests.</p>
     *
     * @param clientId LinkUp client id
     * @param jobId LinkUp engine job id
     * @param pipelineId optional pipeline id
     * @param limit max history size
     * @param status optional checkpoint status filter
     * @return checkpoint history list returned by LinkUp engine
     */
    public List<Map<String, Object>> checkpointHistory(
            Long clientId,
            Long jobId,
            Long pipelineId,
            Integer limit,
            String status
    ) {
        checkClientAndJob(clientId, jobId);

        int safeLimit = limit == null || limit <= 0 ? 20 : Math.min(limit, 200);

        return linkUpRestClient.checkpointHistory(
                clientId,
                jobId,
                pipelineId,
                safeLimit,
                status
        );
    }

    /**
     * Gets engine logs for a batch job instance.
     */
    private String getOfflineInstanceLogs(Long instanceId) {
        JobInstance instance = jobInstanceDao.queryById(instanceId);

        if (instance == null) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "离线任务实例不存在, instanceId=" + instanceId
            );
        }

        return getEngineLogs(
                instance.getClientId(),
                instance.getEngineJobId(),
                "BATCH",
                instanceId
        );
    }


    /**
     * Queries engine logs through LinkUp REST API.
     *
     * <p>The engine job id must exist because LinkUp logs are queried by engine-side
     * job id instead of the local job instance id.</p>
     */
    private String getEngineLogs(
            Long clientId,
            String engineJobId,
            String jobMode,
            Long instanceId
    ) {
        if (clientId == null) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "clientId 为空, jobMode=" + jobMode + ", instanceId=" + instanceId
            );
        }

        if (StringUtils.isBlank(engineJobId)) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "engineJobId 为空，任务可能尚未成功提交, jobMode="
                            + jobMode
                            + ", instanceId="
                            + instanceId
            );
        }

        return linkUpRestClient.jobLogs(clientId, engineJobId, "json");
    }


    /**
     * Validates client id and engine job id before querying checkpoint information.
     */
    private void checkClientAndJob(
            Long clientId,
            Long jobId
    ) {
        if (clientId == null) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "clientId 不能为空"
            );
        }

        if (jobId == null) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "jobId 不能为空"
            );
        }

        getEntity(clientId);
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
