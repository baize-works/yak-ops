package io.baize.flow.application.service.impl;

import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.MapUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.hocon.DataSourceHoconBuilder;
import org.apache.seatunnel.plugin.datasource.api.jdbc.DataSourceProcessor;
import org.apache.seatunnel.plugin.datasource.api.jdbc.JdbcCatalog;
import org.apache.seatunnel.plugin.datasource.api.modal.DataSourceTableColumn;
import org.apache.seatunnel.plugin.datasource.api.utils.DataSourceUtils;
import io.baize.flow.application.service.DataSourceCatalogService;
import io.baize.flow.application.service.DataSourceService;
import io.baize.flow.common.QueryResult;
import io.baize.flow.domain.exceptions.ServiceException;
import io.baize.flow.application.support.time.TimeVariableJdbcSqlRenderService;
import io.baize.flow.dao.entity.DataSource;
import io.baize.flow.web.contract.dto.config.JobScheduleConfig;
import io.baize.flow.web.contract.vo.ColumnOptionVO;
import io.baize.flow.web.contract.vo.OptionVO;
import io.baize.flow.plugin.spi.datasource.BaseConnectionParam;
import io.baize.flow.plugin.spi.enums.Status;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
public class DataSourceCatalogServiceImpl implements DataSourceCatalogService {

    private static final String KEY_TABLE_PATH = "table_path";
    private static final String KEY_QUERY = "query";
    private static final String KEY_READ_MODE = "read_mode";

    private static final String KEY_PLUGIN_NAME = "pluginName";
    private static final String KEY_CONNECTOR_TYPE = "connectorType";

    private static final String KEY_PARAMS_LIST = "paramsList";
    private static final String KEY_PARAM_NAME = "paramName";
    private static final String KEY_PARAM_VALUE = "paramValue";

    private static final String READ_MODE_SQL = "sql";

    @Resource
    private DataSourceService dataSourceService;

    @Resource
    private TimeVariableJdbcSqlRenderService timeVariableJdbcSqlRenderService;

    @Override
    public List<OptionVO> listTable(Long datasourceId) {
        DataSource dataSource = getDataSourceOrThrow(datasourceId);
        BaseConnectionParam connectionParam = buildConnectionParam(dataSource);

        try {
            return getJdbcCatalog(dataSource, connectionParam).listTableOptions();
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to list tables, datasourceId={}", datasourceId, e);
            throw new ServiceException(Status.DATASOURCE_METADATA_ERROR, e.getMessage());
        }
    }

    @Override
    public List<OptionVO> listTableReference(Long datasourceId, String matchMode, String keyword) {
        List<OptionVO> allTables = listTable(datasourceId);

        if (StringUtils.isBlank(keyword)) {
            return allTables;
        }

        if ("2".equals(matchMode)) {
            return allTables.stream()
                    .filter(table -> String.valueOf(table.getValue()).matches(keyword))
                    .collect(Collectors.toList());
        }

        if ("3".equals(matchMode)) {
            String[] exactNames = keyword.split(",");
            return allTables.stream()
                    .filter(table -> matchExactTable(String.valueOf(table.getValue()), exactNames))
                    .collect(Collectors.toList());
        }

        return allTables;
    }

    @Override
    public List<ColumnOptionVO> listColumn(Long datasourceId, Map<String, Object> requestBody) {
        validateDatasourceId(datasourceId);
        validateRequestBody(requestBody, "requestBody");

        DataSource dataSource = getDataSourceOrThrow(datasourceId);
        BaseConnectionParam connectionParam = buildConnectionParam(dataSource);

        try {
            Map<String, Object> columnRequestBody =
                    renderSqlQueryIfNecessary(dataSource, requestBody);

            List<DataSourceTableColumn> columns =
                    getJdbcCatalog(dataSource, connectionParam).listColumns(columnRequestBody);

            return columns.stream()
                    .map(column -> {
                        ColumnOptionVO optionVO = new ColumnOptionVO();
                        optionVO.setKey(column.getOrdinalPosition());
                        optionVO.setFieldName(column.getColumnName());
                        optionVO.setFieldType(column.getSourceType());
                        optionVO.setIsNullable(column.getIsNullable());
                        optionVO.setFieldComment(column.getColumnComment());
                        optionVO.setFieldKey(column.getColumnKey());
                        return optionVO;
                    })
                    .collect(Collectors.toList());
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to list columns, datasourceId={}, requestBody={}", datasourceId, requestBody, e);
            throw new ServiceException(Status.DATASOURCE_METADATA_ERROR, e.getMessage());
        }
    }

    @Override
    public QueryResult getTop20Data(Long datasourceId, Map<String, Object> requestBody) {
        validateDatasourceId(datasourceId);
        validateRequestBody(requestBody, "requestBody");

        DataSource dataSource = getDataSourceOrThrow(datasourceId);
        BaseConnectionParam connectionParam = buildConnectionParam(dataSource);

        try {
            Map<String, Object> previewRequestBody =
                    renderSqlQueryIfNecessary(dataSource, requestBody);

            JdbcCatalog jdbcCatalog = getJdbcCatalog(dataSource, connectionParam);

            QueryResult queryResult = jdbcCatalog.getTop20Data(previewRequestBody);
            Integer total = jdbcCatalog.count(previewRequestBody);

            if (queryResult == null) {
                queryResult = new QueryResult();
            }

            queryResult.setTotal(total);
            return queryResult;
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to query top20 preview data, datasourceId={}, requestBody={}", datasourceId, requestBody, e);
            throw new ServiceException(Status.DATASOURCE_METADATA_ERROR, e.getMessage());
        }
    }

    @Override
    public Integer count(Long datasourceId, Map<String, Object> requestBody) {
        validateDatasourceId(datasourceId);
        validateRequestBody(requestBody, "requestBody");

        DataSource dataSource = getDataSourceOrThrow(datasourceId);
        BaseConnectionParam connectionParam = buildConnectionParam(dataSource);

        try {
            Map<String, Object> previewRequestBody =
                    renderSqlQueryIfNecessary(dataSource, requestBody);

            return getJdbcCatalog(dataSource, connectionParam).count(previewRequestBody);
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to count preview data, datasourceId={}, requestBody={}", datasourceId, requestBody, e);
            throw new ServiceException(Status.DATASOURCE_METADATA_ERROR, e.getMessage());
        }
    }

    @Override
    public String buildSqlTemplate(Long datasourceId, Map<String, Object> requestBody) {
        validateDatasourceId(datasourceId);
        validateRequestBody(requestBody, "requestBody");

        String tablePath = getRequiredText(requestBody, KEY_TABLE_PATH);
        getRequiredText(requestBody, KEY_READ_MODE);

        DataSource dataSource = getDataSourceOrThrow(datasourceId);
        BaseConnectionParam connectionParam = buildConnectionParam(dataSource);
        JdbcCatalog jdbcCatalog = getJdbcCatalog(dataSource, connectionParam);

        Map<String, Object> columnRequest = Map.of(
                KEY_READ_MODE, "table",
                KEY_TABLE_PATH, tablePath,
                KEY_QUERY, ""
        );

        try {
            List<DataSourceTableColumn> columns = jdbcCatalog.listColumns(columnRequest);
            if (columns == null || columns.isEmpty()) {
                throw new ServiceException(Status.DATASOURCE_COLUMN_NOT_FOUND, tablePath);
            }
            return jdbcCatalog.buildSelectAllColumnsSql(tablePath, columns);
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to build sql template, datasourceId={}, tablePath={}", datasourceId, tablePath, e);
            throw new ServiceException(Status.DATASOURCE_METADATA_ERROR, e.getMessage());
        }
    }

    @Override
    public String resolveSql(Long datasourceId, Map<String, Object> requestBody) {
        validateDatasourceId(datasourceId);
        validateRequestBody(requestBody, "requestBody");

        DataSource dataSource = getDataSourceOrThrow(datasourceId);
        BaseConnectionParam connectionParam = buildConnectionParam(dataSource);

        try {
            Map<String, Object> resolvedRequestBody =
                    renderSqlQueryIfNecessary(dataSource, requestBody);

            String query = getRequiredText(resolvedRequestBody, KEY_QUERY);

            return getJdbcCatalog(dataSource, connectionParam).resolveSqlVariables(query);
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to resolve sql, datasourceId={}, requestBody={}", datasourceId, requestBody, e);
            throw new ServiceException(Status.DATASOURCE_METADATA_ERROR, e.getMessage());
        }
    }

    private Map<String, Object> renderSqlQueryIfNecessary(
            DataSource dataSource,
            Map<String, Object> requestBody) {

        String readMode = getText(requestBody, KEY_READ_MODE);
        if (!READ_MODE_SQL.equalsIgnoreCase(readMode)) {
            return requestBody;
        }

        String query = getText(requestBody, KEY_QUERY);
        if (StringUtils.isBlank(query)) {
            return requestBody;
        }

        if (!containsTimeVariable(query)) {
            return requestBody;
        }

        DataSourceHoconBuilder hoconBuilder = getPreviewHoconBuilder(dataSource, requestBody);
        JobScheduleConfig scheduleConfig = buildScheduleConfig(requestBody);

        String renderedQuery = timeVariableJdbcSqlRenderService.renderSql(
                query,
                hoconBuilder,
                scheduleConfig
        );

        Map<String, Object> nextRequestBody = new HashMap<>(requestBody);
        nextRequestBody.put(KEY_QUERY, renderedQuery);

        log.info("Rendered preview sql, originalSql={}, renderedSql={}", query, renderedQuery);

        return nextRequestBody;
    }

    private DataSourceHoconBuilder getPreviewHoconBuilder(
            DataSource dataSource,
            Map<String, Object> requestBody) {

        String pluginName = resolvePluginName(dataSource, requestBody);

        try {
            DataSourceProcessor processor =
                    DataSourceUtils.getDatasourceProcessor(dataSource.getDbType());

            return processor.getQueryBuilder(pluginName);
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to get preview hocon builder, datasourceId={}, dbType={}, pluginName={}",
                    dataSource.getId(), dataSource.getDbType(), pluginName, e);
            throw new ServiceException(Status.DATASOURCE_METADATA_ERROR, e.getMessage());
        }
    }

    private String resolvePluginName(DataSource dataSource, Map<String, Object> requestBody) {
        String pluginName = getText(requestBody, KEY_PLUGIN_NAME);
        if (StringUtils.isNotBlank(pluginName)) {
            return pluginName;
        }

        String connectorType = getText(requestBody, KEY_CONNECTOR_TYPE);
        if (StringUtils.isNotBlank(connectorType)) {
            return connectorType;
        }

        /*
         * 兜底逻辑：
         * 前端预览接口当前不一定传 pluginName。
         * JDBC 插件一般是 JDBC-MYSQL / JDBC-POSTGRESQL / JDBC-ORACLE 这种形式。
         *
         * 如果你的 DbType 与插件名不是这个规则，建议前端 requestBody 明确传 pluginName。
         */
        return "JDBC-" + String.valueOf(dataSource.getDbType()).toUpperCase();
    }

    private JobScheduleConfig buildScheduleConfig(Map<String, Object> requestBody) {
        JobScheduleConfig scheduleConfig = new JobScheduleConfig();
        scheduleConfig.setParamsList(buildScheduleParamItems(requestBody.get(KEY_PARAMS_LIST)));
        return scheduleConfig;
    }

    @SuppressWarnings("unchecked")
    private List<JobScheduleConfig.ScheduleParamItem> buildScheduleParamItems(Object rawParamsList) {
        List<JobScheduleConfig.ScheduleParamItem> result = new ArrayList<>();

        if (!(rawParamsList instanceof List) || ((List<?>) rawParamsList).isEmpty()) {
            return result;
        }

        List<?> paramsList = (List<?>) rawParamsList;

        for (Object rawItem : paramsList) {
            if (!(rawItem instanceof Map)) {
                continue;
            }

            Map<?, ?> rawMap = (Map<?, ?>) rawItem;

            String paramName = getText(rawMap, KEY_PARAM_NAME);
            String paramValue = getText(rawMap, KEY_PARAM_VALUE);

            if (StringUtils.isBlank(paramName)) {
                continue;
            }

            JobScheduleConfig.ScheduleParamItem item =
                    new JobScheduleConfig.ScheduleParamItem();

            /*
             * 注意：
             * 这里 paramName 实际保存的是 TimeVariable 的数据库 ID。
             * TimeVariableJdbcSqlRenderService 里会用这个 ID 去判断：
             * SQL 中的 ${start_time} 是否在 paramsList 中配置过。
             */
            item.setParamName(paramName);
            item.setParamValue(paramValue);

            result.add(item);
        }

        return result;
    }

    private boolean containsTimeVariable(String query) {
        return query.contains("${");
    }

    private DataSource getDataSourceOrThrow(Long datasourceId) {
        validateDatasourceId(datasourceId);

        DataSource dataSource = dataSourceService.selectById(datasourceId);
        if (dataSource == null) {
            log.warn("Datasource not found, datasourceId={}", datasourceId);
            throw new ServiceException(Status.DATASOURCE_NOT_EXIST);
        }
        return dataSource;
    }

    private BaseConnectionParam buildConnectionParam(DataSource dataSource) {
        try {
            return DataSourceUtils.buildConnectionParams(
                    dataSource.getDbType(),
                    dataSource.getConnectionParams()
            );
        } catch (Exception e) {
            log.error("Failed to build connection param, datasourceId={}", dataSource.getId(), e);
            throw new ServiceException(Status.DATASOURCE_METADATA_ERROR, e.getMessage());
        }
    }

    private JdbcCatalog getJdbcCatalog(DataSource dataSource, BaseConnectionParam connectionParam) {
        try {
            return DataSourceUtils
                    .getDatasourceProcessor(dataSource.getDbType())
                    .getMetadataService(connectionParam);
        } catch (Exception e) {
            log.error("Failed to get jdbc catalog, datasourceId={}", dataSource.getId(), e);
            throw new ServiceException(Status.DATASOURCE_METADATA_ERROR, e.getMessage());
        }
    }

    private void validateDatasourceId(Long datasourceId) {
        if (datasourceId == null || datasourceId <= 0) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "datasourceId");
        }
    }

    private void validateRequestBody(Map<String, Object> requestBody, String fieldName) {
        if (MapUtils.isEmpty(requestBody)) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, fieldName);
        }
    }

    private String getRequiredText(Map<String, Object> requestBody, String key) {
        String value = getText(requestBody, key);
        if (StringUtils.isBlank(value)) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, key);
        }
        return value;
    }

    private String getText(Map<?, ?> map, String key) {
        if (map == null || !map.containsKey(key)) {
            return null;
        }

        Object value = map.get(key);
        if (value == null) {
            return null;
        }

        return String.valueOf(value).trim();
    }

    private boolean matchExactTable(String tableName, String[] exactNames) {
        for (String exact : exactNames) {
            if (tableName.equals(exact.trim())) {
                return true;
            }
        }
        return false;
    }

    private OptionVO toOption(String value) {
        OptionVO optionVO = new OptionVO();
        optionVO.setLabel(value);
        optionVO.setValue(value);
        return optionVO;
    }
}