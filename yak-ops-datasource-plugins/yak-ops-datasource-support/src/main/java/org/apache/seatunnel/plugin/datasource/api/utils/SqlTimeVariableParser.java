package org.apache.seatunnel.plugin.datasource.api.utils;

import org.apache.commons.lang3.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;

public final class SqlTimeVariableParser {

    private SqlTimeVariableParser() {
    }

    public static LocalDateTime parse(String variable) {
        if (StringUtils.isBlank(variable)) {
            throw new IllegalArgumentException("SQL variable must not be blank");
        }

        LocalDate today = LocalDate.now();

        switch (variable) {
            case "now":
                return LocalDateTime.now();
            case "today_start":
                return today.atStartOfDay();
            case "today_end":
                return today.atTime(23, 59, 59);
            case "yesterday_start":
                return today.minusDays(1).atStartOfDay();
            case "yesterday_end":
                return today.minusDays(1).atTime(23, 59, 59);
            case "tomorrow_start":
                return today.plusDays(1).atStartOfDay();
            case "tomorrow_end":
                return today.plusDays(1).atTime(23, 59, 59);
            case "month_start":
                return today.withDayOfMonth(1).atStartOfDay();
            case "year_start":
                return today.withDayOfYear(1).atStartOfDay();
            default:
                throw new IllegalArgumentException("Unsupported SQL variable: " + variable);
        }
    }
}
