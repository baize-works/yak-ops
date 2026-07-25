package io.yak.ops.application.support.time;


import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class TimeExpressionEvaluator {

    private static final Pattern BASE_PATTERN = Pattern.compile("^(now|today|schedule_time)");
    private static final Pattern OFFSET_PATTERN = Pattern.compile("([+-])(\\d+)([smhdMy])");
    private static final Pattern ROUND_PATTERN = Pattern.compile("@([a-zA-Z_]+)$");

    public String evaluateToString(String expression, String timeFormat, LocalDateTime scheduleTime) {
        LocalDateTime value = evaluate(expression, scheduleTime);
        return value.format(DateTimeFormatter.ofPattern(timeFormat));
    }

    public LocalDateTime evaluate(String expression, LocalDateTime scheduleTime) {
        if (!StringUtils.hasText(expression)) {
            throw new IllegalArgumentException("时间表达式不能为空");
        }

        String text = expression.trim();

        Matcher baseMatcher = BASE_PATTERN.matcher(text);
        if (!baseMatcher.find()) {
            throw new IllegalArgumentException("不支持的时间表达式：" + expression);
        }

        String base = baseMatcher.group(1);
        LocalDateTime value = resolveBaseTime(base, scheduleTime);

        String remaining = text.substring(base.length());

        String roundMode = null;
        Matcher roundMatcher = ROUND_PATTERN.matcher(remaining);
        if (roundMatcher.find()) {
            roundMode = roundMatcher.group(1);
            remaining = remaining.substring(0, roundMatcher.start());
        }

        value = applyOffsets(value, remaining, expression);

        if (StringUtils.hasText(roundMode)) {
            value = applyRound(value, roundMode);
        }

        return value;
    }

    private LocalDateTime resolveBaseTime(String base, LocalDateTime scheduleTime) {
        switch (base) {
            case "now":
                return LocalDateTime.now();
            case "today":
                return LocalDate.now().atStartOfDay();
            case "schedule_time":
                return scheduleTime == null ? LocalDateTime.now() : scheduleTime;
            default:
                throw new IllegalArgumentException("不支持的基础时间：" + base);
        }
    }

    private LocalDateTime applyOffsets(LocalDateTime value, String offsetText, String originalExpression) {
        if (!StringUtils.hasText(offsetText)) {
            return value;
        }

        int index = 0;
        Matcher matcher = OFFSET_PATTERN.matcher(offsetText);

        while (matcher.find()) {
            if (matcher.start() != index) {
                throw new IllegalArgumentException("时间偏移表达式不合法：" + originalExpression);
            }

            String operator = matcher.group(1);
            long amount = Long.parseLong(matcher.group(2));
            String unit = matcher.group(3);

            if ("-".equals(operator)) {
                amount = -amount;
            }

            value = applyOffset(value, amount, unit);
            index = matcher.end();
        }

        if (index != offsetText.length()) {
            throw new IllegalArgumentException("时间偏移表达式不合法：" + originalExpression);
        }

        return value;
    }

    private LocalDateTime applyOffset(LocalDateTime value, long amount, String unit) {
        switch (unit) {
            case "s":
                return value.plusSeconds(amount);
            case "m":
                return value.plusMinutes(amount);
            case "h":
                return value.plusHours(amount);
            case "d":
                return value.plusDays(amount);
            case "M":
                return value.plusMonths(amount);
            case "y":
                return value.plusYears(amount);
            default:
                throw new IllegalArgumentException("不支持的时间单位：" + unit);
        }
    }

    private LocalDateTime applyRound(LocalDateTime value, String roundMode) {
        switch (roundMode) {
            case "minute_start":
                return value.withSecond(0).withNano(0);

            case "hour_start":
                return value.withMinute(0).withSecond(0).withNano(0);

            case "day_start":
                return value.toLocalDate().atStartOfDay();

            case "day_end":
                return LocalDateTime.of(value.toLocalDate(), LocalTime.MAX).withNano(0);

            case "month_start":
                return YearMonth.from(value).atDay(1).atStartOfDay();

            case "month_end":
                LocalDate lastDay = YearMonth.from(value).atEndOfMonth();
                return LocalDateTime.of(lastDay, LocalTime.MAX).withNano(0);

            default:
                throw new IllegalArgumentException("不支持的取整规则：" + roundMode);
        }
    }
}
