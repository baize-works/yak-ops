package io.yak.ops.business.quality.schedule;

import io.yak.ops.business.quality.api.QualityApi.RunMode;
import io.yak.ops.business.quality.api.QualityApi.ScheduleFrequency;
import io.yak.ops.business.quality.api.QualityApi.ScheduleWeekday;
import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Component;

@Component
public class QualityScheduleCalculator {

  private static final DateTimeFormatter TIME_FORMATTER =
      DateTimeFormatter.ofPattern("HH:mm");

  public LocalDateTime nextRun(
      RunMode runMode,
      ScheduleFrequency frequency,
      String scheduleTime,
      ScheduleWeekday weekday,
      String cronExpression,
      LocalDateTime from) {
    if (runMode != RunMode.SCHEDULE) {
      return null;
    }
    if (frequency == null) {
      throw new IllegalArgumentException("调度触发必须选择调度周期");
    }
    LocalDateTime base = from == null ? LocalDateTime.now() : from;
    return switch (frequency) {
      case DAILY -> nextDaily(parseTime(scheduleTime), base);
      case WEEKLY -> nextWeekly(parseTime(scheduleTime), requiredWeekday(weekday), base);
      case CRON -> nextCron(cronExpression, base);
    };
  }

  public void validateCron(String expression) {
    parseCron(expression);
  }

  private LocalDateTime nextDaily(LocalTime time, LocalDateTime from) {
    LocalDateTime candidate = from.toLocalDate().atTime(time);
    return candidate.isAfter(from) ? candidate : candidate.plusDays(1);
  }

  private LocalDateTime nextWeekly(
      LocalTime time,
      ScheduleWeekday weekday,
      LocalDateTime from) {
    DayOfWeek target = DayOfWeek.valueOf(weekday.name());
    int days = Math.floorMod(target.getValue() - from.getDayOfWeek().getValue(), 7);
    LocalDateTime candidate = from.toLocalDate().plusDays(days).atTime(time);
    if (!candidate.isAfter(from)) {
      candidate = candidate.plusWeeks(1);
    }
    return candidate;
  }

  private LocalDateTime nextCron(String expression, LocalDateTime from) {
    LocalDateTime next = parseCron(expression).next(from);
    if (next == null) {
      throw new IllegalArgumentException("Cron 表达式无法计算下一次执行时间");
    }
    return next;
  }

  private LocalTime parseTime(String value) {
    if (value == null || value.isBlank()) {
      throw new IllegalArgumentException("调度触发必须填写执行时间");
    }
    try {
      return LocalTime.parse(value.trim(), TIME_FORMATTER);
    } catch (DateTimeParseException exception) {
      throw new IllegalArgumentException("执行时间格式必须为 HH:mm", exception);
    }
  }

  private ScheduleWeekday requiredWeekday(ScheduleWeekday weekday) {
    if (weekday == null) {
      throw new IllegalArgumentException("每周调度必须选择执行日期");
    }
    return weekday;
  }

  private CronExpression parseCron(String value) {
    if (value == null || value.isBlank()) {
      throw new IllegalArgumentException("Cron 表达式不能为空");
    }
    try {
      return CronExpression.parse(value.trim());
    } catch (IllegalArgumentException exception) {
      throw new IllegalArgumentException("Cron 表达式格式不正确", exception);
    }
  }
}
