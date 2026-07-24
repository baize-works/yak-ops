package io.baize.flow.engine.client.transfrom.domain;

import lombok.Data;
import org.apache.commons.lang3.StringUtils;

/**
 * SQL Transform frontend config.
 *
 * <pre>
 * {
 *   "pluginInput": "source-output",
 *   "pluginOutput": "sql-output",
 *   "sql": "select * from dual"
 * }
 * </pre>
 */
@Data
public class SQLTransformConfig {

    /**
     * 上游插件输出标识。
     */
    private String pluginInput;

    /**
     * 当前 SQL Transform 的输出标识。
     */
    private String pluginOutput;

    /**
     * 前端使用的字段名称。
     */
    private String sql;


    private String query;

    public String getEffectiveQuery() {
        if (StringUtils.isNotBlank(query)) {
            return query;
        }
        return sql;
    }
}