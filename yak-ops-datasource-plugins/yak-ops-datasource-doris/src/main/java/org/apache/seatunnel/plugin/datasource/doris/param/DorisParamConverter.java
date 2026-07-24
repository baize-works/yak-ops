package org.apache.seatunnel.plugin.datasource.doris.param;

import org.apache.commons.collections4.MapUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.constants.DataSourceConstants;
import org.apache.seatunnel.plugin.datasource.api.jdbc.JdbcParamConverter;
import io.baize.flow.common.utils.JSONUtils;
import io.baize.flow.plugin.spi.datasource.BaseConnectionParam;
import io.baize.flow.plugin.spi.enums.DbType;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class DorisParamConverter implements JdbcParamConverter {

    @Override
    public BaseConnectionParam createConnectionParams(String connectionJson) {
        DorisConnectionParam param = JSONUtils.parseObject(connectionJson, DorisConnectionParam.class);

        if (param == null) {
            throw new IllegalArgumentException("Doris connection param must not be null");
        }

        // 如果 fenodes 为空但 host 有值，自动拼接 fenodes
        if (StringUtils.isBlank(param.getFenodes()) && StringUtils.isNotBlank(param.getHost())) {
            param.setFenodes(param.getHost() + ":8030");
        }

        // 如果 host 为空但 fenodes 有值，从 fenodes 中提取第一个 host
        if (StringUtils.isBlank(param.getHost()) && StringUtils.isNotBlank(param.getFenodes())) {
            param.setHost(param.getFeHost());
        }

        param.setDbType(DbType.DORIS);

        // JDBC URL: 从 fenodes 提取 host，端口替换为 queryPort
        // 用于元数据查询（SHOW TABLES、INFORMATION_SCHEMA 等）
        param.setUrl(buildJdbcUrl(param));

        if (StringUtils.isBlank(param.getDriver())) {
            param.setDriver(DataSourceConstants.COM_MYSQL_CJ_JDBC_DRIVER);
        }

        return param;
    }

    @Override
    public void checkDatasourceParam(BaseConnectionParam baseConnectionParam) {
        // no extra validation needed
    }

    /**
     * 构建 JDBC URL，从 fenodes 中提取所有 host，端口替换为 queryPort。
     *
     * <p>单节点: fenodes="127.0.0.1:8030", queryPort=9030
     * → jdbc:mysql://127.0.0.1:9030/database</p>
     *
     * <p>多节点: fenodes="192.168.1.101:8030,192.168.1.102:8030", queryPort=9030
     * → jdbc:mysql:loadbalance://192.168.1.101:9030,192.168.1.102:9030/database</p>
     */
    private String buildJdbcUrl(DorisConnectionParam param) {
        List<String> queryNodes = param.getQueryNodes();
        String database = param.getDatabase();

        String hostsPart;
        String jdbcPrefix;

        if (queryNodes.size() <= 1) {
            jdbcPrefix = DataSourceConstants.JDBC_DORIS;
            hostsPart = queryNodes.isEmpty()
                    ? "127.0.0.1:" + param.getQueryPortAsInt()
                    : queryNodes.get(0);
        } else {
            jdbcPrefix = DataSourceConstants.JDBC_DORIS_LOADBALANCE;
            hostsPart = String.join(",", queryNodes);
        }

        String base = String.format("%s%s/%s", jdbcPrefix, hostsPart, database);

        Map<String, String> other = param.getOtherAsMap();
        if (MapUtils.isEmpty(other)) {
            return base;
        }

        return base + "?" + buildQueryString(other);
    }

    private String buildQueryString(Map<String, String> params) {
        return params.entrySet().stream()
                .map(e -> e.getKey() + "=" + e.getValue())
                .collect(Collectors.joining("&"));
    }
}
