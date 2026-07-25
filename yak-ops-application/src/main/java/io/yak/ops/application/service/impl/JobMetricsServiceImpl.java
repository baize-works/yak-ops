package io.yak.ops.application.service.impl;

import javax.annotation.Resource;
import lombok.NonNull;
import lombok.extern.slf4j.Slf4j;
import io.yak.ops.application.modal.ParsedJobMetrics;
import io.yak.ops.application.service.JobMetricsService;
import io.yak.ops.common.enums.TimeRange;
import io.yak.ops.common.enums.UnitKind;
import io.yak.ops.dao.entity.JobMetrics;
import io.yak.ops.dao.entity.JobTableMetrics;
import io.yak.ops.dao.repository.JobMetricsDao;
import io.yak.ops.dao.repository.JobTableMetricsDao;
import io.yak.ops.engine.api.EngineRuntimeClientPort;
import io.yak.ops.application.metrics.model.Scale;
import io.yak.ops.application.metrics.model.TimeWindow;
import io.yak.ops.application.model.vo.ChartDataItemVO;
import io.yak.ops.application.model.vo.OverviewChartsVO;
import io.yak.ops.application.model.vo.OverviewSummaryVO;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * LinkUp job metrics service.
 *
 * <p>
 * This implementation parses both:
 * 1. Pipeline level metrics.
 * 2. Table level metrics.
 * </p>
 */
@Service
@Slf4j
public class JobMetricsServiceImpl implements JobMetricsService {

    @Resource
    private EngineRuntimeClientPort engineRestClient;

    @Resource
    private JobMetricsDao jobMetricsDao;

    @Resource
    private JobTableMetricsDao jobTableMetricsDao;

    private static final ZoneId ZONE_ID = ZoneId.of("Asia/Shanghai");

    private static final DateTimeFormatter DT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Override
    public ParsedJobMetrics getJobMetricsFromEngine(@NonNull Long clientId,
                                                    @NonNull String jobEngineId) {
        Map<String, Object> jobInfo = engineRestClient.jobInfo(clientId, jobEngineId);
        if (jobInfo == null || jobInfo.isEmpty()) {
            return new ParsedJobMetrics();
        }

        Object metricsObj = jobInfo.get("metrics");
        if (!(metricsObj instanceof Map)) {
            return new ParsedJobMetrics();
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> metrics = (Map<String, Object>) metricsObj;

        ParsedJobMetrics parsed = new ParsedJobMetrics();

        Map<Integer, JobMetrics> pipelineMetrics = parsePipelineMetrics(metrics);
        List<JobTableMetrics> tableMetrics = parseTableMetrics(jobInfo, metrics);

        fillPipelineQpsFromTableMetricsIfNecessary(pipelineMetrics, tableMetrics);

        parsed.setPipelineMetrics(pipelineMetrics);
        parsed.setTableMetrics(tableMetrics);

        return parsed;
    }

    private void fillPipelineQpsFromTableMetricsIfNecessary(Map<Integer, JobMetrics> pipelineMetrics,
                                                            List<JobTableMetrics> tableMetrics) {
        if (pipelineMetrics == null || pipelineMetrics.isEmpty()) {
            return;
        }

        if (tableMetrics == null || tableMetrics.isEmpty()) {
            return;
        }

        Map<Integer, BigDecimal> readQpsByPipeline = new HashMap<>();
        Map<Integer, BigDecimal> writeQpsByPipeline = new HashMap<>();

        Map<Integer, BigDecimal> readBpsByPipeline = new HashMap<>();
        Map<Integer, BigDecimal> writeBpsByPipeline = new HashMap<>();

        for (JobTableMetrics item : tableMetrics) {
            Integer pipelineId = item.getPipelineId() == null ? 0 : item.getPipelineId();

            readQpsByPipeline.merge(
                    pipelineId,
                    defaultDecimal(item.getReadQps()),
                    BigDecimal::add
            );

            writeQpsByPipeline.merge(
                    pipelineId,
                    defaultDecimal(item.getWriteQps()),
                    BigDecimal::add
            );

            readBpsByPipeline.merge(
                    pipelineId,
                    defaultDecimal(item.getReadBps()),
                    BigDecimal::add
            );

            writeBpsByPipeline.merge(
                    pipelineId,
                    defaultDecimal(item.getWriteBps()),
                    BigDecimal::add
            );
        }

        for (Map.Entry<Integer, JobMetrics> entry : pipelineMetrics.entrySet()) {
            Integer pipelineId = entry.getKey() == null ? 0 : entry.getKey();
            JobMetrics item = entry.getValue();

            if (item == null) {
                continue;
            }

            if (isZero(item.getReadQps())) {
                item.setReadQps(readQpsByPipeline.getOrDefault(pipelineId, BigDecimal.ZERO).setScale(4));
            }

            if (isZero(item.getWriteQps())) {
                item.setWriteQps(writeQpsByPipeline.getOrDefault(pipelineId, BigDecimal.ZERO).setScale(4));
            }

            if (isZero(item.getReadBps())) {
                item.setReadBps(readBpsByPipeline.getOrDefault(pipelineId, BigDecimal.ZERO).setScale(4));
            }

            if (isZero(item.getWriteBps())) {
                item.setWriteBps(writeBpsByPipeline.getOrDefault(pipelineId, BigDecimal.ZERO).setScale(4));
            }
        }
    }

    private BigDecimal defaultDecimal(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private boolean isZero(BigDecimal value) {
        return value == null || BigDecimal.ZERO.compareTo(value) == 0;
    }

    /**
     * Parse pipeline level metrics.
     *
     * <p>
     * Compatible with two structures:
     * 1. Flat metrics:
     *    SourceReceivedCount=xxx, SinkWriteCount=xxx
     * 2. Pipeline keyed metrics:
     *    1={SourceReceivedCount=xxx, SinkWriteCount=xxx}
     * </p>
     */
    @SuppressWarnings({"rawtypes", "unchecked"})
    private Map<Integer, JobMetrics> parsePipelineMetrics(Map<String, Object> metrics) {
        Map<Integer, JobMetrics> result = new LinkedHashMap<>();
        if (metrics == null || metrics.isEmpty()) {
            return result;
        }

        boolean pipelineKeyed = true;
        for (String key : metrics.keySet()) {
            if (!isNumeric(key)) {
                pipelineKeyed = false;
                break;
            }
        }

        if (pipelineKeyed) {
            for (Map.Entry<String, Object> entry : metrics.entrySet()) {
                Integer pipelineId = Integer.valueOf(entry.getKey());

                if (!(entry.getValue() instanceof Map)) {
                    continue;
                }

                Map block = (Map) entry.getValue();
                JobMetrics po = mapPipelineBlock(pipelineId, block);
                result.put(pipelineId, po);
            }

            return result;
        }

        JobMetrics po = mapPipelineBlock(0, metrics);
        result.put(0, po);
        return result;
    }

    private JobMetrics mapPipelineBlock(Integer pipelineId, Map<?, ?> block) {
        JobMetrics po = new JobMetrics();
        po.setPipelineId(pipelineId == null ? 0 : pipelineId);

        po.setReadRowCount(getLong(block,
                "readRowCount",
                "ReadRowCount",
                "SourceReceivedCount",
                "sourceReceivedCount"));

        po.setWriteRowCount(getLong(block,
                "writeRowCount",
                "WriteRowCount",
                "SinkWriteCount",
                "sinkWriteCount"));

        po.setReadQps(getDecimal(block,
                "readQps",
                "ReadQps",
                "SourceReceivedQPS",
                "SourceReceivedQps",
                "sourceReceivedQPS"));

        po.setWriteQps(getDecimal(block,
                "writeQps",
                "WriteQps",
                "SinkWriteQPS",
                "SinkWriteQps",
                "sinkWriteQPS"));

        po.setReadBytes(getLong(block,
                "readBytes",
                "ReadBytes",
                "SourceReceivedBytes",
                "sourceReceivedBytes"));

        po.setWriteBytes(getLong(block,
                "writeBytes",
                "WriteBytes",
                "SinkWriteBytes",
                "sinkWriteBytes"));

        po.setReadBps(getDecimal(block,
                "readBps",
                "ReadBps",
                "SourceReceivedBytesPerSeconds",
                "sourceReceivedBytesPerSeconds"));

        po.setWriteBps(getDecimal(block,
                "writeBps",
                "WriteBps",
                "SinkWriteBytesPerSeconds",
                "sinkWriteBytesPerSeconds"));

        po.setIntermediateQueueSize(getLong(block,
                "intermediateQueueSize",
                "IntermediateQueueSize"));

        po.setRecordDelay(getLong(block,
                "recordDelay",
                "RecordDelay",
                "RecordDelayMs"));

        po.setLagCount(getLong(block,
                "lagCount",
                "LagCount"));

        po.setLossRate(getDecimal(block,
                "lossRate",
                "LossRate"));

        po.setAvgRowSize(getLong(block,
                "avgRowSize",
                "AvgRowSize"));

        fillDefaultPipelineMetrics(po);

        return po;
    }

    /**
     * Parse table level metrics.
     *
     * <p>
     * LinkUp returns table metrics like:
     * TableSourceReceivedCount={sourceTable=10}
     * TableSinkWriteCount={sinkTable=10}
     *
     * This method tries to pair source and sink tables using jobDag.vertexInfoMap.tablePaths.
     * </p>
     */
    @SuppressWarnings({"rawtypes", "unchecked"})
    private List<JobTableMetrics> parseTableMetrics(Map<String, Object> jobInfo,
                                                    Map<String, Object> metrics) {
        if (metrics == null || metrics.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        List<TablePair> tablePairs = parseTablePairsFromJobDag(jobInfo);

        Map<String, Object> sourceCountMap = asStringObjectMap(metrics.get("TableSourceReceivedCount"));
        Map<String, Object> sinkCountMap = asStringObjectMap(metrics.get("TableSinkWriteCount"));

        Map<String, Object> sourceQpsMap = asStringObjectMap(metrics.get("TableSourceReceivedQPS"));
        Map<String, Object> sinkQpsMap = asStringObjectMap(metrics.get("TableSinkWriteQPS"));

        Map<String, Object> sourceBytesMap = asStringObjectMap(metrics.get("TableSourceReceivedBytes"));
        Map<String, Object> sinkBytesMap = asStringObjectMap(metrics.get("TableSinkWriteBytes"));

        Map<String, Object> sourceBpsMap = asStringObjectMap(metrics.get("TableSourceReceivedBytesPerSeconds"));
        Map<String, Object> sinkBpsMap = asStringObjectMap(metrics.get("TableSinkWriteBytesPerSeconds"));

        if (tablePairs.isEmpty()) {
            tablePairs = buildTablePairsFromMetricKeys(sourceCountMap, sinkCountMap);
        }

        List<JobTableMetrics> list = new ArrayList<>();

        for (TablePair pair : tablePairs) {
            JobTableMetrics item = new JobTableMetrics();
            item.setPipelineId(pair.getPipelineId());
            item.setSourceTable(pair.getSourceTable());
            item.setSinkTable(pair.getSinkTable());

            item.setReadRowCount(getLongByKey(sourceCountMap, pair.getSourceTable()));
            item.setWriteRowCount(getLongByKey(sinkCountMap, pair.getSinkTable()));

            item.setReadQps(toDecimal(sourceQpsMap.get(pair.getSourceTable())));
            item.setWriteQps(toDecimal(sinkQpsMap.get(pair.getSinkTable())));

            item.setReadBytes(getLongByKey(sourceBytesMap, pair.getSourceTable()));
            item.setWriteBytes(getLongByKey(sinkBytesMap, pair.getSinkTable()));

            item.setReadBps(toDecimal(sourceBpsMap.get(pair.getSourceTable())));
            item.setWriteBps(toDecimal(sinkBpsMap.get(pair.getSinkTable())));

            item.setStatus(resolveTableStatus(item));

            fillDefaultTableMetrics(item);

            list.add(item);
        }

        return list;
    }

    @SuppressWarnings({"rawtypes", "unchecked"})
    private List<TablePair> parseTablePairsFromJobDag(Map<String, Object> jobInfo) {
        Object jobDagObj = jobInfo.get("jobDag");
        if (!(jobDagObj instanceof Map)) {
            return java.util.Collections.emptyList();
        }

        Map jobDag = (Map) jobDagObj;
        Object vertexInfoMapObj = jobDag.get("vertexInfoMap");

        if (!(vertexInfoMapObj instanceof Collection)) {
            return java.util.Collections.emptyList();
        }

        List<String> sourceTables = new ArrayList<>();
        List<String> sinkTables = new ArrayList<>();

        for (Object vertexObj : (Collection<?>) vertexInfoMapObj) {
            if (!(vertexObj instanceof Map)) {
                continue;
            }

            Map vertex = (Map) vertexObj;
            String type = String.valueOf(vertex.get("type"));

            Object tablePathsObj = vertex.get("tablePaths");
            if (!(tablePathsObj instanceof Collection)) {
                continue;
            }

            List<String> tables = new ArrayList<>();
            for (Object tableObj : (Collection<?>) tablePathsObj) {
                if (tableObj != null) {
                    tables.add(String.valueOf(tableObj));
                }
            }

            if ("source".equalsIgnoreCase(type)) {
                sourceTables.addAll(tables);
            } else if ("sink".equalsIgnoreCase(type)) {
                sinkTables.addAll(tables);
            }
        }

        int size = Math.max(sourceTables.size(), sinkTables.size());
        List<TablePair> pairs = new ArrayList<>(size);

        for (int i = 0; i < size; i++) {
            TablePair pair = new TablePair();
            pair.setPipelineId(0);
            pair.setSourceTable(i < sourceTables.size() ? sourceTables.get(i) : null);
            pair.setSinkTable(i < sinkTables.size() ? sinkTables.get(i) : null);
            pairs.add(pair);
        }

        return pairs;
    }

    private List<TablePair> buildTablePairsFromMetricKeys(Map<String, Object> sourceCountMap,
                                                          Map<String, Object> sinkCountMap) {
        List<String> sourceTables = new ArrayList<>(sourceCountMap.keySet());
        List<String> sinkTables = new ArrayList<>(sinkCountMap.keySet());

        int size = Math.max(sourceTables.size(), sinkTables.size());
        List<TablePair> pairs = new ArrayList<>(size);

        for (int i = 0; i < size; i++) {
            TablePair pair = new TablePair();
            pair.setPipelineId(0);
            pair.setSourceTable(i < sourceTables.size() ? sourceTables.get(i) : null);
            pair.setSinkTable(i < sinkTables.size() ? sinkTables.get(i) : null);
            pairs.add(pair);
        }

        return pairs;
    }

    private String resolveTableStatus(JobTableMetrics item) {
        long read = item.getReadRowCount() == null ? 0L : item.getReadRowCount();
        long write = item.getWriteRowCount() == null ? 0L : item.getWriteRowCount();

        if (read == 0 && write == 0) {
            return "IDLE";
        }

        if (read == write) {
            return "NORMAL";
        }

        if (write < read) {
            return "LAGGING";
        }

        return "UNKNOWN";
    }

    private void fillDefaultPipelineMetrics(JobMetrics po) {
        if (po.getReadRowCount() == null) po.setReadRowCount(0L);
        if (po.getWriteRowCount() == null) po.setWriteRowCount(0L);
        if (po.getReadQps() == null) po.setReadQps(BigDecimal.ZERO);
        if (po.getWriteQps() == null) po.setWriteQps(BigDecimal.ZERO);
        if (po.getReadBytes() == null) po.setReadBytes(0L);
        if (po.getWriteBytes() == null) po.setWriteBytes(0L);
        if (po.getReadBps() == null) po.setReadBps(BigDecimal.ZERO);
        if (po.getWriteBps() == null) po.setWriteBps(BigDecimal.ZERO);
        if (po.getIntermediateQueueSize() == null) po.setIntermediateQueueSize(0L);
        if (po.getLagCount() == null) po.setLagCount(0L);
        if (po.getLossRate() == null) po.setLossRate(BigDecimal.ZERO);
        if (po.getAvgRowSize() == null) po.setAvgRowSize(0L);
        if (po.getRecordDelay() == null) po.setRecordDelay(0L);
    }

    private void fillDefaultTableMetrics(JobTableMetrics item) {
        if (item.getReadRowCount() == null) item.setReadRowCount(0L);
        if (item.getWriteRowCount() == null) item.setWriteRowCount(0L);
        if (item.getReadQps() == null) item.setReadQps(BigDecimal.ZERO);
        if (item.getWriteQps() == null) item.setWriteQps(BigDecimal.ZERO);
        if (item.getReadBytes() == null) item.setReadBytes(0L);
        if (item.getWriteBytes() == null) item.setWriteBytes(0L);
        if (item.getReadBps() == null) item.setReadBps(BigDecimal.ZERO);
        if (item.getWriteBps() == null) item.setWriteBps(BigDecimal.ZERO);
        if (item.getStatus() == null) item.setStatus("UNKNOWN");
    }

    @Override
    public void saveMetricsBatch(@NonNull List<JobMetrics> metricsList) {
        if (metricsList.isEmpty()) {
            return;
        }

        jobMetricsDao.insertBatch(metricsList);
    }

    @Override
    public void saveTableMetricsBatch(@NonNull List<JobTableMetrics> metricsList) {
        if (metricsList.isEmpty()) {
            return;
        }

        jobTableMetricsDao.insertBatch(metricsList);
    }

    @Override
    public OverviewSummaryVO summary(TimeRange timeRange, String taskType) {
        TimeWindow w = parseTimeRange(timeRange);

        Map<String, Object> row = jobMetricsDao.selectOverviewSummary(
                w.getStart().format(DT),
                w.getEnd().format(DT),
                taskType
        );

        OverviewSummaryVO dto = new OverviewSummaryVO();

        long totalRecords = toLong(row.get("totalRecords"));
        long totalBytes = toLong(row.get("totalBytes"));

        Scale recordsScale = pickScaleForSummary(totalRecords, UnitKind.RECORDS);
        dto.setTotalRecords((long) round2(totalRecords / recordsScale.getFactor()));
        dto.setTotalRecordsUnit(recordsScale.getUnit());

        Scale bytesScale = pickScaleForSummary(totalBytes, UnitKind.BYTES);
        dto.setTotalBytes((long) round2(totalBytes / bytesScale.getFactor()));
        dto.setTotalBytesUnit(bytesScale.getUnit());

        dto.setTotalTasks(toLong(row.get("totalTasks")));
        dto.setSuccessTasks(dto.getTotalTasks());

        return dto;
    }

    @Override
    public OverviewChartsVO charts(TimeRange timeRange, String taskType) {
        TimeWindow w = parseTimeRange(timeRange);
        String granularity = pickGranularity(timeRange);

        List<Map<String, Object>> recordsTrendRows =
                jobMetricsDao.selectRecordsTrend(
                        w.getStart().format(DT),
                        w.getEnd().format(DT),
                        taskType,
                        granularity
                );

        List<Map<String, Object>> bytesTrendRows =
                jobMetricsDao.selectBytesTrend(
                        w.getStart().format(DT),
                        w.getEnd().format(DT),
                        taskType,
                        granularity
                );

        List<Map<String, Object>> recordsSpeedRows =
                jobMetricsDao.selectRecordsSpeedTrend(
                        w.getStart().format(DT),
                        w.getEnd().format(DT),
                        taskType,
                        granularity
                );

        List<Map<String, Object>> bytesSpeedRows =
                jobMetricsDao.selectBytesSpeedTrend(
                        w.getStart().format(DT),
                        w.getEnd().format(DT),
                        taskType,
                        granularity
                );

        OverviewChartsVO dto = new OverviewChartsVO();
        dto.setRecordsTrend(toChartItems(recordsTrendRows, UnitKind.RECORDS));
        dto.setBytesTrend(toChartItems(bytesTrendRows, UnitKind.BYTES));
        dto.setRecordsSpeedTrend(toChartItems(recordsSpeedRows, UnitKind.RAW));
        dto.setBytesSpeedTrend(toChartItems(bytesSpeedRows, UnitKind.RAW));

        return dto;
    }

    private Scale pickScaleForSummary(long value, UnitKind kind) {
        if (kind == UnitKind.RECORDS) {
            if (value >= 100_000_000L) {
                return new Scale(100_000_000d, "100M");
            }

            if (value >= 10_000L) {
                return new Scale(10_000d, "万");
            }

            return new Scale(1d, "");
        }

        if (kind == UnitKind.BYTES) {
            if (value >= (1L << 40)) {
                return new Scale((double) (1L << 40), "TB");
            }

            if (value >= (1L << 30)) {
                return new Scale((double) (1L << 30), "GB");
            }

            if (value >= (1L << 20)) {
                return new Scale((double) (1L << 20), "MB");
            }

            if (value >= (1L << 10)) {
                return new Scale((double) (1L << 10), "KB");
            }

            return new Scale(1d, "B");
        }

        return new Scale(1d, "");
    }

    private Scale pickScale(UnitKind kind, List<Map<String, Object>> rows) {
        long max = 0L;

        for (Map<String, Object> row : rows) {
            long value = toLong(row.get("value"));
            if (value > max) {
                max = value;
            }
        }

        if (kind == UnitKind.RECORDS) {
            if (max >= 100_000_000L) {
                return new Scale(100_000_000d, "100M records");
            }

            if (max >= 10_000L) {
                return new Scale(10_000d, "万 records");
            }

            return new Scale(1d, "records");
        }

        if (kind == UnitKind.BYTES) {
            if (max >= (1L << 40)) {
                return new Scale((double) (1L << 40), "TB");
            }

            if (max >= (1L << 30)) {
                return new Scale((double) (1L << 30), "GB");
            }

            if (max >= (1L << 20)) {
                return new Scale((double) (1L << 20), "MB");
            }

            if (max >= (1L << 10)) {
                return new Scale((double) (1L << 10), "KB");
            }

            return new Scale(1d, "B");
        }

        return new Scale(1d, "");
    }

    private List<ChartDataItemVO> toChartItems(List<Map<String, Object>> rows,
                                               UnitKind kind) {
        Scale scale = pickScale(kind, rows);
        List<ChartDataItemVO> list = new ArrayList<>(rows.size());

        for (Map<String, Object> row : rows) {
            ChartDataItemVO item = new ChartDataItemVO();

            item.setDate(String.valueOf(row.get("date")));

            long raw = toLong(row.get("value"));
            double shown = raw / scale.getFactor();

            item.setValue(round2(shown));
            item.setUnit(scale.getUnit());

            list.add(item);
        }

        return list;
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private TimeWindow parseTimeRange(TimeRange timeRange) {
        LocalDateTime end = LocalDateTime.now(ZONE_ID);
        TimeRange tr = timeRange == null ? TimeRange.H24 : timeRange;
        LocalDateTime start = end.minus(tr.duration());
        return new TimeWindow(start, end);
    }

    private String pickGranularity(TimeRange timeRange) {
        TimeRange tr = timeRange == null ? TimeRange.H24 : timeRange;
        return tr.granularity();
    }

    private boolean isNumeric(String value) {
        if (value == null || value.isEmpty()) {
            return false;
        }

        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (c < '0' || c > '9') {
                return false;
            }
        }

        return true;
    }

    private Long getLong(Map<?, ?> map, String... keys) {
        Object value = getValueIgnoreCase(map, keys);
        return toLong(value);
    }

    private BigDecimal getDecimal(Map<?, ?> map, String... keys) {
        Object value = getValueIgnoreCase(map, keys);
        return toDecimal(value);
    }

    private Object getValueIgnoreCase(Map<?, ?> map, String... keys) {
        if (map == null || map.isEmpty() || keys == null || keys.length == 0) {
            return null;
        }

        for (String key : keys) {
            if (map.containsKey(key)) {
                return map.get(key);
            }

            for (Object currentKey : map.keySet()) {
                if (currentKey != null && key.equalsIgnoreCase(String.valueOf(currentKey))) {
                    return map.get(currentKey);
                }
            }
        }

        return null;
    }

    private Long getLongByKey(Map<String, Object> map, String key) {
        if (map == null || key == null) {
            return 0L;
        }

        return toLong(map.get(key));
    }

    private Long toLong(Object value) {
        if (value == null) {
            return 0L;
        }

        try {
            if (value instanceof Number) {
                return ((Number) value).longValue();
            }

            String str = String.valueOf(value).trim();
            if (str.isEmpty() || "null".equalsIgnoreCase(str)) {
                return 0L;
            }

            return new BigDecimal(str).longValue();
        } catch (Exception e) {
            return 0L;
        }
    }

    private BigDecimal toDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }

        try {
            BigDecimal decimal;

            if (value instanceof BigDecimal) {
                decimal = (BigDecimal) value;
            } else if (value instanceof Number) {
                decimal = BigDecimal.valueOf(((Number) value).doubleValue());
            } else {
                String str = String.valueOf(value).trim();
                if (str.isEmpty() || "null".equalsIgnoreCase(str)) {
                    return BigDecimal.ZERO;
                }
                decimal = new BigDecimal(str);
            }

            return decimal.setScale(4);
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asStringObjectMap(Object obj) {
        if (!(obj instanceof Map)) {
            return java.util.Collections.emptyMap();
        }

        Map<?, ?> raw = (Map<?, ?>) obj;
        Map<String, Object> result = new LinkedHashMap<>();

        for (Map.Entry<?, ?> entry : raw.entrySet()) {
            if (entry.getKey() != null) {
                result.put(String.valueOf(entry.getKey()), entry.getValue());
            }
        }

        return result;
    }

    @lombok.Data
    private static class TablePair {
        private Integer pipelineId;
        private String sourceTable;
        private String sinkTable;
    }
}
