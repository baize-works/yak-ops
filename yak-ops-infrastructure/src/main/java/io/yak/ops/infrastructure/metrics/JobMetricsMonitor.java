package io.yak.ops.infrastructure.metrics;

import javax.annotation.Resource;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import io.yak.ops.application.modal.ParsedJobMetrics;
import io.yak.ops.application.service.BatchJobInstanceService;
import io.yak.ops.application.service.JobMetricsService;
import io.yak.ops.application.port.WorkflowMetricsPublisher;
import io.yak.ops.common.utils.CodeGenerateUtils;
import io.yak.ops.dao.entity.JobMetrics;
import io.yak.ops.dao.entity.JobTableMetrics;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Monitor LinkUp job metrics.
 *
 * <p>
 * Responsibilities:
 * 1. Poll real-time metrics from LinkUp Engine.
 * 2. Write snapshots to job log file.
 * 3. Push metrics to WebSocket.
 * 4. Persist final metrics when job finishes.
 * 5. Avoid endless polling when job status is not finalized in time.
 * </p>
 */
@Component
@Slf4j
public class JobMetricsMonitor {

    private final Map<Long, JobRuntimeContext> monitoringJobs = new ConcurrentHashMap<>();

    private final Map<Long, JobFileLogger> loggers = new ConcurrentHashMap<>();

    private final Map<Long, MonitorState> monitorStates = new ConcurrentHashMap<>();

    @Value("${linkup.metrics.log-every-times:10}")
    private int logEveryTimes;

    /**
     * Maximum time to keep polling metrics for one job.
     *
     * <p>
     * Default: 30 minutes.
     * Set to 0 or negative to disable timeout.
     * </p>
     */
    @Value("${linkup.metrics.max-monitor-ms:1800000}")
    private long maxMonitorMs;

    /**
     * Maximum continuous empty metrics count.
     *
     * <p>
     * If Engine returns empty metrics continuously, we should stop monitoring
     * to avoid endless polling.
     * </p>
     */
    @Value("${linkup.metrics.max-empty-times:30}")
    private int maxEmptyTimes;

    /**
     * Maximum continuous metrics fetching error count.
     */
    @Value("${linkup.metrics.max-error-times:30}")
    private int maxErrorTimes;

    /**
     * Warn when read/write rows do not change for a long time.
     *
     * <p>
     * This only writes warning logs. It does not stop the job.
     * Default: 5 minutes.
     * </p>
     */
    @Value("${linkup.metrics.no-progress-warn-ms:300000}")
    private long noProgressWarnMs;

    @Resource
    private JobMetricsService metricsService;

    @Resource
    private BatchJobInstanceService instanceService;

    @Resource
    private WorkflowMetricsPublisher webSocketService;

    public void register(JobRuntimeContext context) {
        Long instanceId = context.getInstanceId();

        monitoringJobs.put(instanceId, context);
        monitorStates.put(instanceId, MonitorState.create());

        try {
            String logPath = instanceService.selectById(instanceId).getLogPath();
            loggers.put(instanceId, new JobFileLogger(logPath));
        } catch (Exception e) {
            log.warn("Failed to create job file logger, instanceId={}", instanceId, e);
        }

        log.info("Metrics monitor registered, instanceId={}, engineId={}",
                instanceId, context.getEngineId());
    }

    public void finalizeAndPersist(Long instanceId, String finalStatus) {
        JobRuntimeContext context = monitoringJobs.get(instanceId);

        if (context == null) {
            log.warn("Metrics monitor context not found when finalizing, instanceId={}", instanceId);
            cleanup(instanceId);
            return;
        }

        finalizeAndPersist(context, finalStatus);
    }

    /**
     * Finalize metrics with explicit runtime context.
     *
     * <p>
     * This method is mainly used by recovery logic after Yak Ops restart.
     * Because monitoringJobs is an in-memory map, it will be empty after restart.
     * Recovery should rebuild JobRuntimeContext from persisted job instance data
     * and call this method directly.
     * </p>
     */
    public void finalizeAndPersist(JobRuntimeContext context, String finalStatus) {
        if (context == null) {
            log.warn("Skip finalizing metrics because context is null");
            return;
        }

        Long instanceId = context.getInstanceId();

        if (instanceId == null || instanceId <= 0) {
            log.warn("Skip finalizing metrics because instanceId is invalid, context={}", context);
            return;
        }

        if (context.getClientId() == null || context.getClientId() <= 0) {
            log.warn("Skip finalizing metrics because clientId is invalid, instanceId={}", instanceId);
            cleanup(instanceId);
            return;
        }

        if (context.getEngineId() == null ) {
            log.warn("Skip finalizing metrics because engineId is invalid, instanceId={}", instanceId);
            cleanup(instanceId);
            return;
        }

        try {
            ParsedJobMetrics parsed = metricsService.getJobMetricsFromEngine(
                    context.getClientId(),
                    context.getEngineId()
            );

            if (parsed != null && !parsed.isEmpty()) {
                attachContext(instanceId, context, parsed);

                JobFileLogger logger = getOrCreateLogger(instanceId);
                if (logger != null) {
                    logger.info("Final Metrics Snapshot:");
                    logger.info(formatMetrics(parsed));
                }

                if (parsed.getPipelineMetrics() != null) {
                    persistPipelineMetrics(parsed.getPipelineMetrics().values());
                }

                persistTableMetrics(parsed.getTableMetrics());

                log.info(
                        "Final metrics persisted, instanceId={}, pipelineCount={}, tableCount={}",
                        instanceId,
                        parsed.getPipelineMetrics() == null ? 0 : parsed.getPipelineMetrics().size(),
                        parsed.getTableMetrics() == null ? 0 : parsed.getTableMetrics().size()
                );
            } else {
                log.warn("Final metrics is empty, instanceId={}, engineId={}",
                        instanceId, context.getEngineId());
            }

            sendFinalEvent(instanceId, context.getEngineId(), finalStatus);
        } catch (Exception e) {
            log.warn("Failed to finalize metrics, instanceId={}, engineId={}",
                    instanceId, context.getEngineId(), e);
            sendFinalEvent(instanceId, context.getEngineId(), "FAILED");
        } finally {
            cleanup(instanceId);
        }
    }

    private JobFileLogger getOrCreateLogger(Long instanceId) {
        JobFileLogger logger = loggers.get(instanceId);
        if (logger != null) {
            return logger;
        }

        try {
            String logPath = instanceService.selectById(instanceId).getLogPath();
            if (logPath == null || logPath.trim().isEmpty()) {
                return null;
            }

            JobFileLogger newLogger = new JobFileLogger(logPath);
            loggers.put(instanceId, newLogger);
            return newLogger;
        } catch (Exception e) {
            log.warn("Failed to create job file logger when finalizing, instanceId={}", instanceId, e);
            return null;
        }
    }

    @Scheduled(fixedDelayString = "${linkup.metrics.interval-ms:2000}")
    public void reportAllWebSocket() {
        if (monitoringJobs.isEmpty()) {
            return;
        }

        monitoringJobs.forEach((instanceId, context) -> {
            try {
                reportSingleJob(instanceId, context);
            } catch (Exception e) {
                handleFetchError(instanceId, context, e);
            }
        });
    }

    private void reportSingleJob(Long instanceId, JobRuntimeContext context) {
        MonitorState state = monitorStates.computeIfAbsent(instanceId, key -> MonitorState.create());

        if (isMonitorTimeout(state)) {
            handleMonitorTimeout(instanceId, context, state);
            return;
        }

        ParsedJobMetrics parsed = metricsService.getJobMetricsFromEngine(
                context.getClientId(),
                context.getEngineId()
        );

        if (parsed == null || parsed.isEmpty()) {
            handleEmptyMetrics(instanceId, context, state);
            return;
        }

        state.setErrorTimes(0);
        state.setEmptyTimes(0);
        state.setPollTimes(state.getPollTimes() + 1);

        attachContext(instanceId, context, parsed);

        writeMetricsLogIfNecessary(instanceId, parsed, state);

        detectNoProgress(instanceId, context, parsed, state);

        webSocketService.publish(
                buildChannel(instanceId, context.getEngineId()),
                buildPayload(instanceId, context.getEngineId(), parsed)
        );
    }

    private void handleEmptyMetrics(Long instanceId, JobRuntimeContext context, MonitorState state) {
        state.setEmptyTimes(state.getEmptyTimes() + 1);

        if (state.getEmptyTimes() == 1 || state.getEmptyTimes() % 10 == 0) {
            log.warn("Empty metrics returned from LinkUp Engine, instanceId={}, engineId={}, emptyTimes={}",
                    instanceId, context.getEngineId(), state.getEmptyTimes());
        }

        if (maxEmptyTimes > 0 && state.getEmptyTimes() >= maxEmptyTimes) {
            log.warn("Metrics monitor stopped because empty metrics exceeded limit, instanceId={}, engineId={}, emptyTimes={}",
                    instanceId, context.getEngineId(), state.getEmptyTimes());

            sendFinalEvent(instanceId, context.getEngineId(), "METRICS_EMPTY_TIMEOUT");
            cleanup(instanceId);
        }
    }

    private void handleFetchError(Long instanceId, JobRuntimeContext context, Exception e) {
        MonitorState state = monitorStates.computeIfAbsent(instanceId, key -> MonitorState.create());
        state.setErrorTimes(state.getErrorTimes() + 1);

        if (state.getErrorTimes() == 1 || state.getErrorTimes() % 10 == 0) {
            log.warn("Failed to fetch metrics, instanceId={}, engineId={}, errorTimes={}",
                    instanceId, context.getEngineId(), state.getErrorTimes(), e);
        }

        if (maxErrorTimes > 0 && state.getErrorTimes() >= maxErrorTimes) {
            log.warn("Metrics monitor stopped because fetch error exceeded limit, instanceId={}, engineId={}, errorTimes={}",
                    instanceId, context.getEngineId(), state.getErrorTimes());

            sendFinalEvent(instanceId, context.getEngineId(), "METRICS_FETCH_FAILED");
            cleanup(instanceId);
        }
    }

    private boolean isMonitorTimeout(MonitorState state) {
        if (maxMonitorMs <= 0) {
            return false;
        }

        return System.currentTimeMillis() - state.getStartTime() >= maxMonitorMs;
    }

    private void handleMonitorTimeout(Long instanceId, JobRuntimeContext context, MonitorState state) {
        long costMs = System.currentTimeMillis() - state.getStartTime();

        log.warn("Metrics monitor stopped because max monitor time exceeded, instanceId={}, engineId={}, costMs={}, maxMonitorMs={}",
                instanceId, context.getEngineId(), costMs, maxMonitorMs);

        JobFileLogger logger = loggers.get(instanceId);
        if (logger != null) {
            logger.warn("Metrics monitor stopped because max monitor time exceeded, costMs="
                    + costMs + ", maxMonitorMs=" + maxMonitorMs);
        }

        sendFinalEvent(instanceId, context.getEngineId(), "METRICS_MONITOR_TIMEOUT");
        cleanup(instanceId);
    }

    private void writeMetricsLogIfNecessary(Long instanceId,
                                            ParsedJobMetrics parsed,
                                            MonitorState state) {
        JobFileLogger logger = loggers.get(instanceId);
        if (logger == null) {
            return;
        }

        if (!shouldWriteMetricsLog(state)) {
            return;
        }

        logger.info(formatMetrics(parsed));
    }

    private boolean shouldWriteMetricsLog(MonitorState state) {
        if (logEveryTimes <= 1) {
            return true;
        }

        long pollTimes = state.getPollTimes();
        return pollTimes == 1 || pollTimes % logEveryTimes == 0;
    }

    private void detectNoProgress(Long instanceId,
                                  JobRuntimeContext context,
                                  ParsedJobMetrics parsed,
                                  MonitorState state) {
        if (noProgressWarnMs <= 0) {
            return;
        }

        ProgressSnapshot current = buildProgressSnapshot(parsed);
        if (current == null) {
            return;
        }

        ProgressSnapshot last = state.getLastProgressSnapshot();
        long now = System.currentTimeMillis();

        if (last == null || current.hasProgressComparedTo(last)) {
            state.setLastProgressSnapshot(current);
            state.setLastProgressTime(now);
            state.setLastNoProgressWarnTime(0L);
            return;
        }

        long noProgressMs = now - state.getLastProgressTime();
        boolean shouldWarn = noProgressMs >= noProgressWarnMs
                && now - state.getLastNoProgressWarnTime() >= noProgressWarnMs;

        if (!shouldWarn) {
            return;
        }

        state.setLastNoProgressWarnTime(now);

        String message = String.format(
                "LinkUp job metrics has no progress, instanceId=%s, engineId=%s, readRows=%s, writeRows=%s, queueSize=%s, noProgressMs=%s",
                instanceId,
                context.getEngineId(),
                current.getReadRows(),
                current.getWriteRows(),
                current.getQueueSize(),
                noProgressMs
        );

        log.warn(message);

        JobFileLogger logger = loggers.get(instanceId);
        if (logger != null) {
            logger.warn(message);
        }
    }

    private ProgressSnapshot buildProgressSnapshot(ParsedJobMetrics parsed) {
        long readRows = 0L;
        long writeRows = 0L;
        long queueSize = 0L;

        if (parsed.getPipelineMetrics() != null) {
            for (JobMetrics item : parsed.getPipelineMetrics().values()) {
                readRows += defaultLong(item.getReadRowCount());
                writeRows += defaultLong(item.getWriteRowCount());
                queueSize += defaultLong(item.getIntermediateQueueSize());
            }
        }

        if (parsed.getTableMetrics() != null && !parsed.getTableMetrics().isEmpty()) {
            long tableReadRows = 0L;
            long tableWriteRows = 0L;

            for (JobTableMetrics item : parsed.getTableMetrics()) {
                tableReadRows += defaultLong(item.getReadRowCount());
                tableWriteRows += defaultLong(item.getWriteRowCount());
            }

            if (tableReadRows > 0 || tableWriteRows > 0) {
                readRows = Math.max(readRows, tableReadRows);
                writeRows = Math.max(writeRows, tableWriteRows);
            }
        }

        return new ProgressSnapshot(readRows, writeRows, queueSize);
    }

    public void finalizeAndPersist(Long instanceId) {
        finalizeAndPersist(instanceId, "FINISHED");
    }


    private void attachContext(Long instanceId,
                               JobRuntimeContext context,
                               ParsedJobMetrics parsed) {
        if (parsed.getPipelineMetrics() != null) {
            for (JobMetrics item : parsed.getPipelineMetrics().values()) {
                item.setJobInstanceId(instanceId);
                item.setJobDefinitionId(context.getJobDefinitionId());
            }
        }

        if (parsed.getTableMetrics() != null) {
            for (JobTableMetrics item : parsed.getTableMetrics()) {
                item.setJobInstanceId(instanceId);
                item.setJobDefinitionId(context.getJobDefinitionId());
            }
        }
    }

    private void persistPipelineMetrics(Collection<JobMetrics> metricsList) {
        if (metricsList == null || metricsList.isEmpty()) {
            return;
        }

        List<JobMetrics> finalList = new ArrayList<>();

        for (JobMetrics item : metricsList) {
            JobMetrics po = new JobMetrics();

            po.setId(generateId());
            po.setJobInstanceId(item.getJobInstanceId());
            po.setJobDefinitionId(item.getJobDefinitionId());
            po.setPipelineId(item.getPipelineId());

            po.setReadRowCount(defaultLong(item.getReadRowCount()));
            po.setWriteRowCount(defaultLong(item.getWriteRowCount()));
            po.setReadQps(defaultDecimal(item.getReadQps()));
            po.setWriteQps(defaultDecimal(item.getWriteQps()));
            po.setReadBytes(defaultLong(item.getReadBytes()));
            po.setWriteBytes(defaultLong(item.getWriteBytes()));
            po.setReadBps(defaultDecimal(item.getReadBps()));
            po.setWriteBps(defaultDecimal(item.getWriteBps()));
            po.setIntermediateQueueSize(defaultLong(item.getIntermediateQueueSize()));
            po.setLagCount(defaultLong(item.getLagCount()));
            po.setLossRate(defaultDecimal(item.getLossRate()));
            po.setAvgRowSize(defaultLong(item.getAvgRowSize()));
            po.setRecordDelay(defaultLong(item.getRecordDelay()));

            po.setCreateTime(new Date());
            po.setUpdateTime(new Date());

            finalList.add(po);
        }

        metricsService.saveMetricsBatch(finalList);
    }

    private void persistTableMetrics(List<JobTableMetrics> tableMetrics) {
        if (tableMetrics == null || tableMetrics.isEmpty()) {
            return;
        }

        List<JobTableMetrics> finalList = new ArrayList<>();

        for (JobTableMetrics item : tableMetrics) {
            JobTableMetrics po = new JobTableMetrics();

            po.setId(generateId());
            po.setJobInstanceId(item.getJobInstanceId());
            po.setJobDefinitionId(item.getJobDefinitionId());
            po.setPipelineId(item.getPipelineId());

            po.setSourceTable(item.getSourceTable());
            po.setSinkTable(item.getSinkTable());

            po.setReadRowCount(defaultLong(item.getReadRowCount()));
            po.setWriteRowCount(defaultLong(item.getWriteRowCount()));
            po.setReadQps(defaultDecimal(item.getReadQps()));
            po.setWriteQps(defaultDecimal(item.getWriteQps()));
            po.setReadBytes(defaultLong(item.getReadBytes()));
            po.setWriteBytes(defaultLong(item.getWriteBytes()));
            po.setReadBps(defaultDecimal(item.getReadBps()));
            po.setWriteBps(defaultDecimal(item.getWriteBps()));

            po.setStatus(item.getStatus());
            po.setErrorMsg(item.getErrorMsg());

            po.setCreateTime(new Date());
            po.setUpdateTime(new Date());

            finalList.add(po);
        }

        metricsService.saveTableMetricsBatch(finalList);
    }

    private Map<String, Object> buildPayload(Long instanceId,
                                             String engineId,
                                             ParsedJobMetrics parsed) {
        Map<String, Object> message = new HashMap<>();
        message.put("type", "METRICS");
        message.put("instanceId", instanceId);
        message.put("engineId", engineId);
        message.put("pipelineMetrics", parsed.getPipelineMetrics());
        message.put("tableMetrics", parsed.getTableMetrics());
        message.put("timestamp", Instant.now().toEpochMilli());
        return message;
    }

    private void sendFinalEvent(Long instanceId, String engineId, String status) {
        Map<String, Object> message = new HashMap<>();
        message.put("type", "JOB_STATUS");
        message.put("instanceId", instanceId);
        message.put("engineId", engineId);
        message.put("status", status);
        message.put("timestamp", Instant.now().toEpochMilli());

        webSocketService.publish(buildChannel(instanceId, engineId), message);
    }

    private String buildChannel(Long instanceId, String engineId) {
        return "job-" + instanceId + "-" + engineId;
    }

    private void cleanup(Long instanceId) {
        monitoringJobs.remove(instanceId);
        monitorStates.remove(instanceId);

        JobFileLogger logger = loggers.remove(instanceId);
        if (logger != null) {
            try {
                logger.close();
            } catch (Exception e) {
                log.warn("Failed to close job file logger, instanceId={}", instanceId, e);
            }
        }

        log.info("Metrics monitor cleaned, instanceId={}", instanceId);
    }

    private String formatMetrics(ParsedJobMetrics parsed) {
        StringBuilder sb = new StringBuilder();

        sb.append("\n==================== Pipeline Metrics Snapshot ====================\n");
        sb.append(String.format(
                "%-10s %-12s %-12s %-12s %-12s %-12s %-12s %-12s %-12s %-10s\n",
                "PipelineID",
                "ReadRows",
                "WriteRows",
                "ReadQPS",
                "WriteQPS",
                "ReadBytes",
                "WriteBytes",
                "ReadBPS",
                "WriteBPS",
                "QueueSize"
        ));
        sb.append("--------------------------------------------------------------------------------\n");

        if (parsed.getPipelineMetrics() != null) {
            for (JobMetrics item : parsed.getPipelineMetrics().values()) {
                sb.append(String.format(
                        "%-10s %-12s %-12s %-12s %-12s %-12s %-12s %-12s %-12s %-10s\n",
                        item.getPipelineId(),
                        formatNumber(defaultLong(item.getReadRowCount())),
                        formatNumber(defaultLong(item.getWriteRowCount())),
                        defaultDecimal(item.getReadQps()),
                        defaultDecimal(item.getWriteQps()),
                        formatBytes(defaultLong(item.getReadBytes())),
                        formatBytes(defaultLong(item.getWriteBytes())),
                        formatBytes(defaultDecimal(item.getReadBps()).longValue()),
                        formatBytes(defaultDecimal(item.getWriteBps()).longValue()),
                        defaultLong(item.getIntermediateQueueSize())
                ));
            }
        }

        sb.append("==================== Table Metrics Snapshot ====================\n");
        sb.append(String.format(
                "%-40s %-40s %-12s %-12s %-12s %-12s %-12s\n",
                "SourceTable",
                "SinkTable",
                "ReadRows",
                "WriteRows",
                "ReadQPS",
                "WriteQPS",
                "Status"
        ));
        sb.append("--------------------------------------------------------------------------------\n");

        if (parsed.getTableMetrics() != null) {
            for (JobTableMetrics item : parsed.getTableMetrics()) {
                sb.append(String.format(
                        "%-40s %-40s %-12s %-12s %-12s %-12s %-12s\n",
                        safe(item.getSourceTable()),
                        safe(item.getSinkTable()),
                        formatNumber(defaultLong(item.getReadRowCount())),
                        formatNumber(defaultLong(item.getWriteRowCount())),
                        defaultDecimal(item.getReadQps()),
                        defaultDecimal(item.getWriteQps()),
                        safe(item.getStatus())
                ));
            }
        }

        sb.append("============================================================\n");

        return sb.toString();
    }

    private Long generateId() {
        try {
            return CodeGenerateUtils.getInstance().genCode();
        } catch (Exception e) {
            return UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE;
        }
    }

    private Long defaultLong(Long value) {
        return value == null ? 0L : value;
    }

    private BigDecimal defaultDecimal(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private String formatNumber(long number) {
        return String.format("%,d", number);
    }

    private String formatBytes(Long bytes) {
        if (bytes == null || bytes <= 0) {
            return "0 B";
        }

        String[] units = {"B", "KB", "MB", "GB", "TB"};
        int unitIndex = (int) (Math.log10(bytes) / Math.log10(1024));
        unitIndex = Math.min(unitIndex, units.length - 1);

        double size = bytes / Math.pow(1024, unitIndex);
        return String.format("%.2f %s", size, units[unitIndex]);
    }

    private String safe(String value) {
        return value == null ? "-" : value;
    }

    @Data
    private static class MonitorState {

        private long startTime;

        private long pollTimes;

        private int emptyTimes;

        private int errorTimes;

        private long lastProgressTime;

        private long lastNoProgressWarnTime;

        private ProgressSnapshot lastProgressSnapshot;

        static MonitorState create() {
            MonitorState state = new MonitorState();
            long now = System.currentTimeMillis();
            state.setStartTime(now);
            state.setLastProgressTime(now);
            return state;
        }
    }

    @Data
    private static class ProgressSnapshot {

        private final long readRows;

        private final long writeRows;

        private final long queueSize;

        boolean hasProgressComparedTo(ProgressSnapshot last) {
            if (last == null) {
                return true;
            }

            return readRows != last.getReadRows()
                    || writeRows != last.getWriteRows()
                    || queueSize != last.getQueueSize();
        }
    }
}
