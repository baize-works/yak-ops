package org.apache.seatunnel.plugin.datasource.api.utils;

import net.sf.jsqlparser.parser.CCJSqlParserUtil;
import net.sf.jsqlparser.statement.Statement;
import net.sf.jsqlparser.statement.select.Select;
import org.apache.commons.lang3.StringUtils;

public final class SqlValidator {

    private SqlValidator() {
    }

    public static void validateSelectQuery(String sql) {
        if (StringUtils.isBlank(sql)) {
            throw new IllegalArgumentException("query is null");
        }

        try {
            Statement statement = CCJSqlParserUtil.parse(sql);
            if (!(statement instanceof Select)) {
                throw new IllegalArgumentException("Only SELECT statements are supported");
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid SQL query: " + e.getMessage(), e);
        }
    }
}
