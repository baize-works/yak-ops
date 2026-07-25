package io.yak.ops.application.service.cdc;

import javax.annotation.Resource;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import io.yak.ops.dao.entity.CdcServerIdAllocation;
import io.yak.ops.dao.entity.CdcServerIdPool;
import io.yak.ops.dao.entity.DataSource;
import io.yak.ops.dao.mapper.CdcServerIdAllocationMapper;
import io.yak.ops.dao.mapper.CdcServerIdPoolMapper;
import io.yak.ops.dao.repository.DataSourceDao;
import io.yak.ops.application.model.dto.command.GuideMultiJobContentCommand;
import io.yak.ops.application.model.dto.command.GuideSingleJobContentCommand;
import io.yak.ops.application.model.dto.command.JobDefinitionSaveCommand;
import io.yak.ops.application.model.dto.config.GuideMultiJobContent;
import io.yak.ops.application.model.dto.config.JobEnvConfig;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class CdcServerIdAllocationService {

    private static final String MYSQL_CDC_PLUGIN = "MySQL-CDC";
    private static final String MODE_AUTO = "AUTO";
    private static final String MODE_MANUAL = "MANUAL";
    private static final long DEFAULT_MIN_SERVER_ID = 5400L;
    private static final long DEFAULT_MAX_SERVER_ID = 6400L;
    private static final long MAX_SERVER_ID = 4294967295L;

    @Resource
    private CdcServerIdPoolMapper poolMapper;

    @Resource
    private CdcServerIdAllocationMapper allocationMapper;

    @Resource
    private DataSourceDao dataSourceDao;

    public void release(Long jobDefinitionId) {
        if (jobDefinitionId != null) {
            allocationMapper.releaseActiveByJobDefinitionId(jobDefinitionId);
        }
    }

    @Transactional(rollbackFor = Exception.class)
    public void prepare(JobDefinitionSaveCommand command, Long jobDefinitionId) {
        if (command == null || jobDefinitionId == null) {
            return;
        }

        List<SourceConfigAccessor> sources = resolveCdcSources(command);
        if (sources.isEmpty()) {
            return;
        }

        allocationMapper.releaseActiveByJobDefinitionId(jobDefinitionId);

        int parallelism = resolveParallelism(command.getEnv());
        for (SourceConfigAccessor source : sources) {
            allocateForSource(source, jobDefinitionId, parallelism);
        }
    }

    private List<SourceConfigAccessor> resolveCdcSources(JobDefinitionSaveCommand command) {
        if (command instanceof GuideMultiJobContentCommand) {
            GuideMultiJobContent content = ((GuideMultiJobContentCommand) command).getContent();
            if (content == null || content.getSource() == null) {
                return java.util.Collections.emptyList();
            }
            GuideMultiJobContent.WorkflowSourceConfig source = content.getSource();
            if (!isMysqlCdc(source.getPluginName())) {
                return java.util.Collections.emptyList();
            }
            return Collections.singletonList(new GuideMultiSourceConfigAccessor(source));
        }

        if (command instanceof GuideSingleJobContentCommand) {
            Map<String, Object> workflow = ((GuideSingleJobContentCommand) command).getWorkflow();
            return resolveSingleWorkflowSources(workflow);
        }

        return java.util.Collections.emptyList();
    }

    @SuppressWarnings("unchecked")
    private List<SourceConfigAccessor> resolveSingleWorkflowSources(Map<String, Object> workflow) {
        if (workflow == null) {
            return java.util.Collections.emptyList();
        }

        Object nodesValue = workflow.get("nodes");
        if (!(nodesValue instanceof List)) {
            return java.util.Collections.emptyList();
        }

        List<SourceConfigAccessor> sources = new ArrayList<>();
        for (Object item : (List<?>) nodesValue) {
            if (!(item instanceof Map)) {
                continue;
            }

            Map<String, Object> node = (Map<String, Object>) item;
            Object dataValue = node.get("data");
            if (!(dataValue instanceof Map)) {
                continue;
            }

            Map<String, Object> data = (Map<String, Object>) dataValue;
            if (!"source".equals(String.valueOf(data.get("nodeType")))) {
                continue;
            }

            Map<String, Object> config = ensureConfig(data);
            String pluginName = firstNonBlank(config.get("pluginName"), data.get("pluginName"));
            if (!isMysqlCdc(pluginName)) {
                continue;
            }

            sources.add(new MapSourceConfigAccessor(config));
        }

        return sources;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> ensureConfig(Map<String, Object> data) {
        Object configValue = data.get("config");
        if (configValue instanceof Map) {
            return (Map<String, Object>) configValue;
        }

        Map<String, Object> config = new LinkedHashMap<>();
        data.put("config", config);
        return config;
    }

    private void allocateForSource(SourceConfigAccessor source, Long jobDefinitionId, int parallelism) {
        Long datasourceId = parseDatasourceId(source.datasourceId());
        if (datasourceId == null) {
            throw new IllegalArgumentException("MySQL-CDC datasource id can not be empty");
        }

        CdcServerIdPool pool = getOrCreatePool(datasourceId);
        String mode = StringUtils.defaultIfBlank(source.serverIdMode(), MODE_MANUAL);

        List<Long> serverIds;
        if (MODE_AUTO.equalsIgnoreCase(mode) || StringUtils.isBlank(source.serverId())) {
            serverIds = allocateAvailable(pool, parallelism);
            source.setServerIdMode(MODE_AUTO);
        } else {
            serverIds = parseServerIds(source.serverId());
            if (serverIds.size() < parallelism) {
                throw new IllegalArgumentException("MySQL-CDC server-id count must be greater than or equal to job parallelism");
            }
            source.setServerIdMode(MODE_MANUAL);
            ensureAvailable(pool.getId(), serverIds);
        }

        insertAllocations(pool.getId(), serverIds, jobDefinitionId, source.serverIdMode());
        source.setServerId(toServerIdText(serverIds));
    }

    private CdcServerIdPool getOrCreatePool(Long datasourceId) {
        CdcServerIdPool pool = poolMapper.selectEnabledByDatasourceIdForUpdate(datasourceId);
        if (pool != null) {
            return pool;
        }

        DataSource dataSource = dataSourceDao.queryById(datasourceId);
        if (dataSource == null) {
            throw new IllegalArgumentException("Datasource does not exist: " + datasourceId);
        }

        CdcServerIdPool created = new CdcServerIdPool();
        created.initInsert();
        created.setDatasourceId(datasourceId);
        created.setInstanceKey("datasource:" + datasourceId);
        created.setMinServerId(DEFAULT_MIN_SERVER_ID);
        created.setMaxServerId(DEFAULT_MAX_SERVER_ID);
        created.setStatus(1);
        poolMapper.insert(created);
        return created;
    }

    private List<Long> allocateAvailable(CdcServerIdPool pool, int count) {
        if (count <= 0) {
            throw new IllegalArgumentException("server-id allocation count must be greater than 0");
        }

        List<Long> occupied = allocationMapper.selectActiveServerIdsByPoolForUpdate(pool.getId());
        Set<Long> occupiedSet = new HashSet<>(occupied == null ? java.util.Collections.emptyList() : occupied);
        List<Long> allocated = new ArrayList<>();
        for (long current = pool.getMinServerId(); current <= pool.getMaxServerId(); current++) {
            if (!occupiedSet.contains(current)) {
                allocated.add(current);
                if (allocated.size() == count) {
                    return allocated;
                }
            }
        }

        throw new IllegalStateException("Not enough available MySQL-CDC server-id values");
    }

    private void ensureAvailable(Long poolId, List<Long> serverIds) {
        List<Long> conflicts = allocationMapper.selectActiveServerIdsForUpdate(poolId, serverIds);
        if (CollectionUtils.isNotEmpty(conflicts)) {
            throw new IllegalArgumentException("MySQL-CDC server-id already allocated: " + conflicts);
        }
    }

    private void insertAllocations(Long poolId, List<Long> serverIds, Long jobDefinitionId, String source) {
        Date now = new Date();
        for (Long serverId : serverIds) {
            CdcServerIdAllocation allocation = new CdcServerIdAllocation();
            allocation.initInsert();
            allocation.setPoolId(poolId);
            allocation.setServerId(serverId);
            allocation.setJobDefinitionId(jobDefinitionId);
            allocation.setSource(StringUtils.defaultIfBlank(source, MODE_MANUAL).toUpperCase());
            allocation.setActive(1);
            allocation.setAllocatedTime(now);
            allocationMapper.insert(allocation);
        }
    }

    private List<Long> parseServerIds(String value) {
        String serverId = StringUtils.trimToEmpty(value);
        if (!serverId.matches("^(?:[1-9]\\d*)(?:-(?:[1-9]\\d*))?$")) {
            throw new IllegalArgumentException("Invalid MySQL-CDC server-id: " + value);
        }

        String[] parts = serverId.split("-");
        long start = Long.parseLong(parts[0]);
        long end = parts.length == 2 ? Long.parseLong(parts[1]) : start;
        if (start > end || end > MAX_SERVER_ID) {
            throw new IllegalArgumentException("Invalid MySQL-CDC server-id range: " + value);
        }

        List<Long> result = new ArrayList<>();
        for (long current = start; current <= end; current++) {
            result.add(current);
        }
        return result;
    }

    private String toServerIdText(List<Long> serverIds) {
        if (serverIds.size() == 1) {
            return String.valueOf(serverIds.get(0));
        }

        List<Long> sorted = new ArrayList<>(serverIds);
        Collections.sort(sorted);
        long start = sorted.get(0);
        long end = sorted.get(sorted.size() - 1);
        if (end - start + 1 == sorted.size()) {
            return start + "-" + end;
        }

        throw new IllegalStateException("MySQL-CDC server-id allocation must be continuous");
    }

    private int resolveParallelism(JobEnvConfig env) {
        if (env == null || env.getParallelism() == null || env.getParallelism() <= 0) {
            return 1;
        }
        return env.getParallelism();
    }

    private Long parseDatasourceId(String datasourceId) {
        if (StringUtils.isBlank(datasourceId)) {
            return null;
        }
        return Long.parseLong(datasourceId);
    }

    private boolean isMysqlCdc(String pluginName) {
        return MYSQL_CDC_PLUGIN.equalsIgnoreCase(StringUtils.trimToEmpty(pluginName));
    }

    private String firstNonBlank(Object... values) {
        for (Object value : values) {
            if (value != null && StringUtils.isNotBlank(String.valueOf(value))) {
                return String.valueOf(value);
            }
        }
        return null;
    }

    private interface SourceConfigAccessor {
        String datasourceId();

        String serverIdMode();

        String serverId();

        void setServerIdMode(String mode);

        void setServerId(String serverId);
    }

    private static class GuideMultiSourceConfigAccessor implements SourceConfigAccessor {
        private final GuideMultiJobContent.WorkflowSourceConfig source;

        private GuideMultiSourceConfigAccessor(GuideMultiJobContent.WorkflowSourceConfig source) {
            this.source = source;
        }

        @Override
        public String datasourceId() {
            return source.getDatasourceId();
        }

        @Override
        public String serverIdMode() {
            return source.getServerIdMode();
        }

        @Override
        public String serverId() {
            return source.getServerId();
        }

        @Override
        public void setServerIdMode(String mode) {
            source.setServerIdMode(mode);
        }

        @Override
        public void setServerId(String serverId) {
            source.setServerId(serverId);
        }
    }

    private static class MapSourceConfigAccessor implements SourceConfigAccessor {
        private final Map<String, Object> config;

        private MapSourceConfigAccessor(Map<String, Object> config) {
            this.config = config;
        }

        @Override
        public String datasourceId() {
            Object value = config.get("dataSourceId");
            return value == null ? null : String.valueOf(value);
        }

        @Override
        public String serverIdMode() {
            Object value = config.get("serverIdMode");
            return value == null ? null : String.valueOf(value);
        }

        @Override
        public String serverId() {
            Object value = config.get("server-id");
            if (value == null) {
                value = config.get("serverId");
            }
            return value == null ? null : String.valueOf(value);
        }

        @Override
        public void setServerIdMode(String mode) {
            config.put("serverIdMode", mode);
        }

        @Override
        public void setServerId(String serverId) {
            config.put("serverId", serverId);
            config.put("server-id", serverId);
        }
    }
}
